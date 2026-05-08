/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewFieldBase } from '@kbn/es-query';
import type { SavedObjectReference } from '@kbn/core-saved-objects-common';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import type { Column, DataSource, SerializedDataSource } from './types';
import { columnFromDatatableColumn } from './to_column';
import { sha256 } from './sha256';

export interface EsqlSourceArgs {
  query: string;
  resultColumns: readonly DatatableColumn[];
  timeFieldName?: string;
  /**
   * Optional DataView used only by {@link EsqlSource.getCompatibilityDataView}.
   * Pass the adhoc DV from upstream (e.g. `getEsqlDataView`) so internal
   * callers that haven't migrated off `DataView` can keep working during the
   * transition.
   */
  dataView?: DataView;
}

interface EsqlSourceConstructorArgs {
  id: string;
  title: string;
  timeFieldName: string | undefined;
  resultColumns: readonly DatatableColumn[];
  dataView: DataView | undefined;
}

/**
 * `DataSource` implementation for ES|QL queries.
 *
 * Built directly from `(query, resultColumns)` — does not require or create a
 * `DataView`. Identity is derived from the FROM clause's target string and the
 * (caller-provided) time field name; columns come from the query response.
 *
 * Construct via the async {@link EsqlSource.create} factory; the constructor
 * is private because id derivation uses `crypto.subtle.digest` (async).
 */
export class EsqlSource implements DataSource {
  public readonly kind = 'esql' as const;
  public readonly id: string;
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
  private readonly compatibilityDataView: DataView | undefined;

  private constructor({
    id,
    title,
    timeFieldName,
    resultColumns,
    dataView,
  }: EsqlSourceConstructorArgs) {
    this.id = id;
    this.title = title;
    this.timeFieldName = timeFieldName;
    this.references = [{ type: 'index-pattern', id, name: 'data-source' }];

    this.resultColumns = resultColumns;
    this.columns = resultColumns.map(columnFromDatatableColumn);
    this.columnsByName = new Map(this.columns.map((c) => [c.name, c]));
    this.fields = this.columns.map((c) => ({
      name: c.name,
      type: c.type,
      esTypes: c.esType ? [c.esType] : undefined,
    }));
    this.compatibilityDataView = dataView;
  }

  /**
   * Async factory. Computes the source id by hashing
   * `{title}-{timeFieldName}`, matching the scheme used by
   * `getESQLAdHocDataview` so existing filters with `meta.index = oldId`
   * keep resolving.
   */
  public static async create(args: EsqlSourceArgs): Promise<EsqlSource> {
    const title = getIndexPatternFromESQLQuery(args.query);
    const hash = await sha256(`${title}-${args.timeFieldName ?? ''}`);
    return new EsqlSource({
      id: `esql-${hash}`,
      title,
      timeFieldName: args.timeFieldName,
      resultColumns: args.resultColumns,
      dataView: args.dataView,
    });
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

  /**
   * @deprecated Compatibility seam. Returns the DataView passed at construction
   * (typically the adhoc cache-adapter DV) for use with legacy helpers in
   * `@kbn/discover-utils` that take a `DataView` for formatter resolution.
   * Will be removed once those helpers migrate off `DataView`.
   *
   * Consumers that just need column metadata should use {@link getColumns} or
   * {@link getColumn}.
   */
  public getCompatibilityDataView(): DataView | undefined {
    return this.compatibilityDataView;
  }
}
