/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataSource } from './types';
import type { EsqlSource } from './esql_source';
import { IndexPatternSource } from './index_pattern_source';

/**
 * Minimal DataView lookup contract used by `DataSourceService`.
 *
 * Decoupled from the full `DataViewsPublicPluginStart` contract so the service
 * is easy to test and not tied to a specific plugin lifecycle. The Kibana
 * `dataViewsService` already satisfies this shape.
 */
export interface DataViewLookup {
  get(id: string): Promise<DataView>;
}

const ESQL_ID_PREFIX = 'esql-';

/**
 * Polymorphic registry over `DataSource` instances.
 *
 * Replaces direct `dataViewsService.get(id)` calls in cross-cutting consumers
 * (filter resolution, etc.) so they handle both source kinds without branching.
 *
 * - For DataView ids → delegates to the underlying `DataViewLookup` and wraps
 *   the result in an {@link IndexPatternSource}.
 * - For `esql-*` ids → returns a registered {@link EsqlSource} instance, or
 *   `undefined` if none is registered.
 *
 * `EsqlSource` registration is consumer-owned: Discover, Lens, etc. call
 * `registerEsqlSource()` when an ES|QL query runs and `unregisterEsqlSource()`
 * on session teardown. Multiple registrations of the same id are last-write-wins.
 */
export class DataSourceService {
  private readonly esqlSources = new Map<string, EsqlSource>();

  constructor(private readonly dataViews: DataViewLookup) {}

  public async get(id: string): Promise<DataSource | undefined> {
    if (id.startsWith(ESQL_ID_PREFIX)) {
      return this.esqlSources.get(id);
    }
    try {
      const dataView = await this.dataViews.get(id);
      return new IndexPatternSource(dataView);
    } catch {
      return undefined;
    }
  }

  /**
   * Synchronous resolution from a `DataView` already in hand. Use this when a
   * caller has the DataView (e.g. from React state) and would otherwise pay
   * for an async round-trip through {@link get} just to re-fetch what it has.
   *
   * - For DataView ids with the `esql-` prefix → returns the registered
   *   {@link EsqlSource}, or `undefined` if none is registered.
   * - For everything else → wraps the DataView in an {@link IndexPatternSource}.
   */
  public fromDataView(dataView: DataView): DataSource | undefined {
    if (!dataView.id) return undefined;
    if (dataView.id.startsWith(ESQL_ID_PREFIX)) {
      return this.esqlSources.get(dataView.id);
    }
    return new IndexPatternSource(dataView);
  }

  public registerEsqlSource(source: EsqlSource): void {
    this.esqlSources.set(source.id, source);
  }

  public unregisterEsqlSource(id: string): void {
    this.esqlSources.delete(id);
  }
}
