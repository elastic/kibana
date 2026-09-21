/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LRUCache } from 'lru-cache';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { DataViewFieldBase } from '@kbn/es-query';
import type { SavedObjectReference } from '@kbn/core-saved-objects-common';
import type { HttpStart } from '@kbn/core/public';
import {
  getIndexPatternFromESQLQuery,
  getESQLSourceInfo,
  getESQLTimeField,
  buildEsqlSourceCacheKey,
  isComputedColumn,
  getQuerySummary,
  type ESQLSourceInfoColumn,
} from '@kbn/esql-utils';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import type { Column, DataSourceBase, SerializedDataSource } from '../types';
import { columnFromDatatableColumn, columnToFieldBase } from '../to_column';
import { sha256 } from '../sha256';

export interface EsqlSourceArgs {
  query: string;
  /**
   * When provided, skips `getESQLSourceInfo` even if `http` is set.
   * Use after a real fetch, or in tests. The instance cache is keyed by query
   * identity, not columns — later `create` calls ignore a new `resultColumns`.
   * Use {@link EsqlSource.withColumns} to replace columns on an existing id.
   */
  resultColumns?: readonly DatatableColumn[];
  timeFieldName?: string;
  /**
   * CPS project routing string. When present it is included in the id hash so
   * that the same query run in different projects produces distinct ids and
   * filter state does not bleed across project boundaries.
   */
  projectRouting?: string;
  /**
   * When provided, the factory resolves the time field (`getESQLTimeField`) and
   * the result schema (`getESQLSourceInfo` / LIMIT 0) in parallel, unless
   * `timeFieldName` / `resultColumns` are already set.
   */
  http?: HttpStart;
  /**
   * Passed to the source_info route so that queries using `?_tstart` / `?_tend`
   * named parameters can be executed for schema discovery.
   */
  timeRange?: { from: string; to: string };
  /**
   * Passed to the source_info route so that queries using ES|QL control
   * variables (`?variable_name`) can be executed for schema discovery.
   */
  esqlVariables?: ESQLControlVariable[];
}

function columnsFromSourceInfo(columns: ESQLSourceInfoColumn[], query: string): DatatableColumn[] {
  const querySummary = getQuerySummary(query);
  return columns.map(({ name, esType }) => ({
    id: name,
    name,
    meta: {
      type: esFieldTypeToKibanaFieldType(esType) as DatatableColumn['meta']['type'],
      esType,
    },
    isNull: false,
    isComputedColumn: isComputedColumn(name, querySummary),
  }));
}

interface EsqlSourceConstructorArgs {
  id: string;
  query: string;
  title: string;
  timeFieldName: string | undefined;
  resultColumns: readonly DatatableColumn[];
}

/**
 * `DataSource` implementation for ES|QL queries.
 *
 * Does not require or create a `DataView`. Identity is derived from the query,
 * optional project routing, and time field name. When `http` is provided,
 * {@link EsqlSource.create} resolves the time field and LIMIT 0 schema in
 * parallel unless `timeFieldName` / `resultColumns` are already set.
 * Source-info failures are ignored and `resultColumns` (or `[]`) is used.
 *
 * Instances are cached by query identity. The first `create` for a key wins;
 * use {@link withColumns} to attach fetch-result columns without changing `id`.
 *
 * Construct via the async {@link EsqlSource.create} factory; the constructor
 * is private because id derivation uses `crypto.subtle.digest` (async).
 */
export class EsqlSource implements DataSourceBase {
  private static readonly instanceCache = new LRUCache<string, EsqlSource>({ max: 100 });

  public readonly kind = 'esql' as const;
  public readonly id: string;
  public readonly query: string;
  public readonly title: string;
  public readonly timeFieldName: string | undefined;
  public readonly references: SavedObjectReference[];
  public readonly fields: DataViewFieldBase[];

  /**
   * Raw response columns from the ES|QL query. Exposed for consumers that need
   * richer per-column metadata than the unified {@link Column} shape provides
   * (e.g. `isComputedColumn`, `timeSeriesMetric`, `isNull`). Most consumers
   * should prefer {@link getColumns}.
   */
  public readonly resultColumns: readonly DatatableColumn[];

  private readonly columns: readonly Column[];
  private readonly columnsByName: ReadonlyMap<string, Column>;

  private constructor({
    id,
    query,
    title,
    timeFieldName,
    resultColumns,
  }: EsqlSourceConstructorArgs) {
    this.id = id;
    this.query = query;
    this.title = title;
    this.timeFieldName = timeFieldName;
    this.references = [{ type: 'index-pattern', id, name: 'data-source' }];

    this.resultColumns = resultColumns;
    this.columns = resultColumns.map(columnFromDatatableColumn);
    this.columnsByName = new Map(this.columns.map((c) => [c.name, c]));
    this.fields = this.columns.map(columnToFieldBase);
  }

  /**
   * Async factory. Identity (and the LRU cache key) is the query, project
   * routing, and time field — not columns. The first successful `create` for a
   * key wins; later calls return that instance. Use {@link withColumns} to
   * attach fetch-result columns without changing `id`.
   */
  public static async create(args: EsqlSourceArgs): Promise<EsqlSource> {
    const { cacheKey: baseKey, cleanVariables } = buildEsqlSourceCacheKey(
      args.query,
      args.projectRouting,
      args.esqlVariables
    );
    // When timeFieldName is explicitly provided it is included in the key so
    // that the same query with a different pre-resolved time field gets a
    // distinct cache entry.
    const instanceKey = args.timeFieldName != null ? `${baseKey}\0${args.timeFieldName}` : baseKey;

    const cached = EsqlSource.instanceCache.get(instanceKey);
    if (cached) return cached;

    const title = getIndexPatternFromESQLQuery(args.query);

    let timeFieldName: string | undefined = args.timeFieldName;
    let resultColumns: readonly DatatableColumn[] = args.resultColumns ?? [];

    const { http } = args;
    const shouldResolveTimeField = Boolean(http) && timeFieldName === undefined;
    const shouldResolveSchema = Boolean(http) && args.resultColumns === undefined;

    if (http && (shouldResolveTimeField || shouldResolveSchema)) {
      const [resolvedTimeField, info] = await Promise.all([
        shouldResolveTimeField
          ? getESQLTimeField({
              query: args.query,
              http,
              projectRouting: args.projectRouting,
            })
          : Promise.resolve(timeFieldName),
        shouldResolveSchema
          ? getESQLSourceInfo({
              query: args.query,
              http,
              projectRouting: args.projectRouting,
              timeRange: args.timeRange,
              timeFieldName: args.timeFieldName,
              esqlVariables: cleanVariables,
            }).catch(() => null)
          : Promise.resolve(null),
      ]);

      timeFieldName = resolvedTimeField;
      if (info) {
        resultColumns = columnsFromSourceInfo(info.columns, args.query);
      }
    }

    const hashInput = JSON.stringify([
      'esql',
      args.query,
      args.projectRouting ?? null,
      timeFieldName ?? null,
    ]);
    const hash = await sha256(hashInput);
    const instance = new EsqlSource({
      id: `esql-${hash}`,
      query: args.query,
      title,
      timeFieldName,
      resultColumns,
    });

    EsqlSource.instanceCache.set(instanceKey, instance);
    return instance;
  }

  public static clearCache(): void {
    EsqlSource.instanceCache.clear();
  }

  /**
   * Dataset identity for the FROM target + time field, independent of query-instance {@link id}.
   * SORT / WHERE / EVAL keep the same key; a different FROM or time field does not.
   */
  public static getDatasetKey(title: string, timeFieldName?: string): string {
    return `esql:${title}:${timeFieldName ?? ''}`;
  }

  public get datasetKey(): string {
    return EsqlSource.getDatasetKey(this.title, this.timeFieldName);
  }

  public get name(): string {
    return this.title;
  }

  public getColumns(): readonly Column[] {
    return this.columns;
  }

  public getColumn(name: string): Column | undefined {
    return this.columnsByName.get(name);
  }

  public isTimeBased(): boolean {
    return !!this.timeFieldName;
  }

  public withColumns(resultColumns: readonly DatatableColumn[]): EsqlSource {
    return new EsqlSource({
      id: this.id,
      query: this.query,
      title: this.title,
      timeFieldName: this.timeFieldName,
      resultColumns,
    });
  }

  public isRollup(): boolean {
    return false;
  }

  public isPersisted(): boolean {
    return false;
  }

  public serialize(): SerializedDataSource {
    return {
      kind: 'esql',
      id: this.id,
      title: this.title,
      timeFieldName: this.timeFieldName,
      references: this.references,
    };
  }
}
