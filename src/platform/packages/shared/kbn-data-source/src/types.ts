/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewBase } from '@kbn/es-query';
import type { SavedObjectReference } from '@kbn/core-saved-objects-common';
import type { KBN_FIELD_TYPES } from '@kbn/field-types';

/**
 * Discriminator for the two implementations of {@link DataSource}.
 *
 * - `index-pattern` — backed by a {@link DataView} (DSL / aggregation queries).
 * - `esql` — backed by an ES|QL query and its result columns.
 */
export type DataSourceKind = 'index-pattern' | 'esql';

/**
 * Origin of a {@link Column}.
 *
 * - `index` — the column corresponds to a field in the underlying index, as
 *   reported by `_field_caps`.
 * - `esql-result` — the column was produced by ES|QL query execution and may
 *   not exist in the index (e.g. computed via `STATS`, `EVAL`).
 */
export type ColumnSource = 'index' | 'esql-result';

/**
 * Minimal column metadata that is the same shape regardless of how the
 * column was sourced.
 *
 * Intentionally excludes `searchable`, `aggregatable`, `runtimeField`,
 * `subType`, `fieldAttrs`, and other index-pattern-specific properties.
 * Consumers that need those should narrow to a specific implementation
 * of {@link DataSource} (e.g. `IndexPatternSource.getDataView()`).
 */
export interface Column {
  readonly name: string;
  readonly type: KBN_FIELD_TYPES;
  readonly esType?: string;
  readonly source: ColumnSource;
}

/**
 * Consumer-facing abstraction over a data source used by Discover, Lens, and
 * Dashboards.
 *
 * Apps consume `DataSource` instead of {@link DataView} directly, so that the
 * same code path serves both DSL (index-pattern-backed) and ES|QL queries
 * without branching.
 *
 * Extends {@link DataViewBase} so that filter utilities in `@kbn/es-query`
 * (`buildEsQuery`, `getDisplayValueFromFilter`, `filter_matches_index`, etc.)
 * accept a `DataSource` directly — no shim or adapter needed.
 *
 * Design rules — load-bearing, do not violate:
 *
 * 1. The {@link Column} shape is the minimum union both implementations can
 *    provide. Source-specific properties are accessed via type narrowing.
 * 2. {@link isTimeBased} returns `!!timeFieldName`. It MUST NOT introspect the
 *    fields/columns array (see kibana#265749 for context).
 * 3. {@link EsqlSource} MUST NOT call `_field_caps`.
 * 4. {@link serialize} returns identity only. Columns are runtime; rehydration
 *    re-derives them from the query result (ES|QL) or DataView refresh (DSL).
 */
export interface DataSource extends DataViewBase {
  readonly kind: DataSourceKind;

  /** Always present for a constructed `DataSource` (narrowed from `DataViewBase`'s optional id). */
  readonly id: string;

  /** Human-readable display name. For `EsqlSource`, defaults to `title`. */
  readonly name: string;

  /**
   * The data target. For `IndexPatternSource` this is the index pattern
   * (e.g. `logs-*`). For `EsqlSource` this is the FROM clause's target —
   * may be an index, pattern, view, alias, cross-cluster reference, or
   * external dataset.
   *
   * Inherited from {@link DataViewBase} as `title`.
   */
  readonly title: string;

  readonly timeFieldName: string | undefined;

  readonly references: SavedObjectReference[];

  /** Returns the per-column metadata for this source. */
  getColumns(): readonly Column[];

  /** Lookup by column name. Returns `undefined` if not found. */
  getColumn(name: string): Column | undefined;

  /**
   * True iff a time field is configured for this source.
   *
   * MUST NOT introspect the fields/columns array. The presence of a configured
   * time field is the only signal — whether that field exists in the current
   * result set is irrelevant.
   */
  isTimeBased(): boolean;

  /**
   * True if this source is backed by a persisted (saved-object) DataView.
   * `EsqlSource` is always `false`; `IndexPatternSource` delegates to the
   * underlying `DataView`.
   */
  isPersisted(): boolean;

  /** Identity-only serialization. Columns are never persisted. */
  serialize(): SerializedDataSource;
}

/**
 * Identity-only persisted form of a {@link DataSource}.
 *
 * Columns are intentionally absent — they are runtime state, re-derived on
 * load from the query result (ES|QL) or DataView refresh (DSL).
 */
export type SerializedDataSource =
  | {
      readonly kind: 'index-pattern';
      readonly id: string;
      readonly references: SavedObjectReference[];
    }
  | {
      readonly kind: 'esql';
      readonly id: string;
      readonly title: string;
      readonly timeFieldName?: string;
      readonly references: SavedObjectReference[];
    };
