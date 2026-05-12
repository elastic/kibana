/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildChangePointLineDataQuery,
  getChangePointByColumns,
  getChangePointOutputColumnNames,
  getChangePointSeriesColumns,
} from '@kbn/esql-utils';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import { CHANGE_POINT_TYPE_COLUMN, CHANGE_POINT_PVALUE_COLUMN } from '../constants';
import { appendEntityFiltersToChangePointLineEsql } from './append_entity_filters_to_line_esql';

export interface ChangePointCardModel {
  readonly id: string;
  readonly title: string;
  readonly lineEsql: string;
  /** The BY grouping column names when the query uses `CHANGE_POINT ... BY col[, col]`. */
  readonly byColumns?: readonly string[];
  readonly annotationEvents: Array<{ name: string; datetime: string }>;
  /**
   * The lowest (most significant) pvalue across all annotation events for this card.
   * Undefined when type/pvalue are absent from the result schema (e.g. BY mode with WHERE type IS NOT NULL).
   */
  readonly minPvalue?: number;
  /** Distinct change-point type strings present in this card's annotations (empty in BY mode). */
  readonly changePointTypes: readonly string[];
  /**
   * Serialized value of each entity-dimension column for this card (keyed by column ID).
   * Populated from entityColumnIds — covers both explicit BY columns and heuristic columns.
   * Empty object for no-split (single-series) cards.
   */
  readonly entityValues: Readonly<Record<string, string>>;
  /**
   * Human-readable "col: val" description of every entity dimension, e.g.
   * `"host: web-server-1, service: orders"`. Always uses `col: val` format (unlike `title`,
   * which omits the column name for single-column cards). `undefined` for no-split cards.
   * Suitable for use as a Lens panel description or case-attachment metadata.
   */
  readonly entityDescription: string | undefined;
}

const serializeCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const formatPvalueLabel = (p: unknown): string => {
  if (typeof p === 'number' && Number.isFinite(p)) {
    if (p === 0) return '0';
    if (p >= 0.01 && p < 1) return p.toFixed(5);
    return p.toExponential(2);
  }
  return String(p ?? '');
};

const pickTimestampCell = (
  row: Record<string, unknown>,
  timeColumn: string,
  table: Datatable,
  reservedColumnIds: ReadonlySet<string>
): unknown => {
  const primary = row[timeColumn];
  if (primary !== undefined && primary !== null) {
    return primary;
  }
  for (const col of table.columns) {
    if (col.meta?.type !== 'date') continue;
    if (reservedColumnIds.has(col.id)) continue;
    const v = row[col.id];
    if (v !== undefined && v !== null) {
      return v;
    }
  }
  return undefined;
};

export const formatAnnotationTimestamp = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (typeof value === 'string' && value.length > 0) {
    const asNum = Number(value);
    if (!Number.isNaN(asNum) && value.length <= 13) {
      return new Date(asNum).toISOString();
    }
    const d = Date.parse(value);
    if (!Number.isNaN(d)) return new Date(d).toISOString();
  }
  return undefined;
};

/** Change-point rows: non-empty type and a defined pvalue column. */
const isChangePointTableRow = (
  row: Record<string, unknown>,
  typeColumnId: string,
  pvalueColumnId: string
): boolean => {
  const t = row[typeColumnId];
  if (t === null || t === undefined || String(t).length === 0) {
    return false;
  }
  const p = row[pvalueColumnId];
  return p !== null && p !== undefined;
};

/**
 * Builds a human-readable card title from entity columns and their values in the first row.
 *
 * Resolution order:
 *  1. Explicit `byColumns` from `CHANGE_POINT ... BY col[, col]`
 *  2. Heuristic `entityColumnIds` (non-reserved columns present in the result table)
 *  3. Returns empty string — caller will use a numbered fallback
 *
 * Single column:  show the value only — `"www.elastic.co"`
 * Multiple columns: show `"col: val"` pairs — `"host: www.elastic.co, response.keyword: 200"`
 */
const buildCardTitle = (
  byColumns: string[] | undefined,
  entityColumnIds: readonly string[],
  firstRow: Record<string, unknown>
): string => {
  const cols = byColumns ?? (entityColumnIds.length > 0 ? [...entityColumnIds] : undefined);
  if (!cols?.length) return '';
  if (cols.length === 1) return serializeCell(firstRow[cols[0]]) || cols[0];
  return cols.map((col) => `${col}: ${serializeCell(firstRow[col])}`).join(', ');
};

type ChangePointRow = Record<string, unknown>;

interface ChangePointCardsBuildContext {
  readonly table: Datatable;
  readonly esql: string;
  readonly typeColumnId: string;
  readonly pvalueColumnId: string;
  readonly timeColumn: string;
  /**
   * Columns used to identify distinct entities. Comes from the explicit `BY` clause when present;
   * otherwise derived heuristically as the result columns that are not reserved (value, time,
   * type, pvalue).
   */
  readonly entityColumnIds: readonly string[];
  readonly timestampReservedIds: ReadonlySet<string>;
  /** Explicit BY grouping columns parsed from `CHANGE_POINT ... BY col[, col]`. */
  readonly byColumns: string[] | undefined;
  /**
   * True when the query uses `CHANGE_POINT ... BY` and the result table does not contain
   * type/pvalue columns. In this mode every row in a group is a change point annotation.
   */
  readonly isByMode: boolean;
  readonly groups: ReadonlyMap<string, { entityLabel: string; rows: ChangePointRow[] }>;
}

const getChangePointCardsBuildContext = (params: {
  table: Datatable | undefined;
  esql: string;
}): ChangePointCardsBuildContext | undefined => {
  const { table, esql } = params;
  if (!table?.columns?.length || !esql) return undefined;

  const series = getChangePointSeriesColumns(esql);
  if (!series) return undefined;

  const outputNames = getChangePointOutputColumnNames(esql);
  const typeColumnId = outputNames?.typeColumn ?? CHANGE_POINT_TYPE_COLUMN;
  const pvalueColumnId = outputNames?.pvalueColumn ?? CHANGE_POINT_PVALUE_COLUMN;

  const { valueColumn, timeColumn } = series;
  const columnIds = table.columns.map((c) => c.id);

  const byColumns = getChangePointByColumns(esql);

  // When BY is explicit, use those columns (filtered to ones present in the current table, since
  // the table may lag a query change). When there is no BY clause, fall back to heuristic: any
  // result column that is not a reserved change-point column is treated as an entity dimension.
  const reservedColumnIds = new Set<string>([
    typeColumnId,
    pvalueColumnId,
    valueColumn,
    timeColumn,
  ]);
  const entityColumnIds: string[] = byColumns
    ? byColumns.filter((id: string) => columnIds.includes(id))
    : columnIds.filter((id: string) => !reservedColumnIds.has(id));

  // BY mode: the new `CHANGE_POINT ... BY` syntax omits type/pvalue from the result schema when
  // combined with `WHERE type IS NOT NULL` — every returned row is a change point event.
  const tableColumnIdSet = new Set(columnIds);
  const isByMode =
    Boolean(byColumns?.length) &&
    !tableColumnIdSet.has(typeColumnId) &&
    !tableColumnIdSet.has(pvalueColumnId);

  const timestampReservedIds = new Set<string>([typeColumnId, pvalueColumnId, valueColumn]);

  const groups = new Map<string, { entityLabel: string; rows: ChangePointRow[] }>();

  for (const row of table.rows as ChangePointRow[]) {
    const entityLabel =
      entityColumnIds.length > 0
        ? entityColumnIds.map((id: string) => `${id}=${serializeCell(row[id])}`).join(', ')
        : '';
    const existing = groups.get(entityLabel);
    if (existing) {
      existing.rows.push(row);
    } else {
      groups.set(entityLabel, { entityLabel, rows: [row] });
    }
  }

  return {
    table,
    esql,
    typeColumnId,
    pvalueColumnId,
    timeColumn,
    entityColumnIds,
    timestampReservedIds,
    byColumns,
    isByMode,
    groups,
  };
};

/**
 * Cheap gate for whether {@link buildChangePointCards} would return at least one card.
 *
 * - No-split (no entity columns): true whenever a line query can be built from the ES|QL, even
 *   if the result table has no rows yet. The chart always renders so the source data line is
 *   visible regardless of whether any change points were detected.
 * - Split (entity columns present via BY clause or heuristic): true when at least one entity
 *   group contains at least one valid annotation event (row with a parseable timestamp and, for
   *   non-BY mode, a non-empty type and defined pvalue). Mirrors the skip logic in
 *   {@link buildChangePointCards} so the predicate never returns `true` when the builder would
 *   return `undefined`.
 */
export const hasChangePointChartCards = (params: {
  table: Datatable | undefined;
  esql: string;
}): boolean => {
  const ctx = getChangePointCardsBuildContext(params);
  if (!ctx) return false;

  // No-split: show a chart even when the result table has no rows (e.g. no change points found).
  if (ctx.entityColumnIds.length === 0) {
    return Boolean(buildChangePointLineDataQuery(ctx.esql));
  }

  // Split: require a buildable line query AND at least one group with a valid annotation.
  // This mirrors the `if (isSplitQuery && annotationEvents.length === 0) continue` guard and the
  // timestamp checks inside buildChangePointCards, ensuring the predicate and the builder agree.
  if (!buildChangePointLineDataQuery(ctx.esql)) return false;

  for (const { rows } of ctx.groups.values()) {
    for (const row of rows) {
      const isAnnotation = ctx.isByMode
        ? true
        : isChangePointTableRow(row, ctx.typeColumnId, ctx.pvalueColumnId);
      if (!isAnnotation) continue;
      const timeCell = pickTimestampCell(row, ctx.timeColumn, ctx.table, ctx.timestampReservedIds);
      if (formatAnnotationTimestamp(timeCell) !== undefined) return true;
    }
  }

  return false;
};

export const buildChangePointCards = (params: {
  table: Datatable | undefined;
  esql: string;
}): ChangePointCardModel[] | undefined => {
  const ctx = getChangePointCardsBuildContext(params);
  if (!ctx) return undefined;

  const {
    table,
    esql,
    typeColumnId,
    pvalueColumnId,
    timeColumn,
    entityColumnIds,
    timestampReservedIds,
    byColumns,
    isByMode,
    groups,
  } = ctx;

  // A query is "split" when it produces distinct entity groups (explicit BY or heuristic).
  const isSplitQuery = entityColumnIds.length > 0;

  // No-split with no table rows: produce one card with an empty annotations list so the source
  // data line is always visible even when no change points were detected.
  if (!isSplitQuery && groups.size === 0) {
    const lineEsql = buildChangePointLineDataQuery(esql);
    if (lineEsql) {
      return [
        {
          id: 'cp-card-all',
          title: i18n.translate('changePointChartViewer.card.defaultTitle', {
            defaultMessage: 'Change point series 1',
          }),
          lineEsql,
          annotationEvents: [],
          changePointTypes: [],
          entityValues: {},
          entityDescription: undefined,
        },
      ];
    }
    return undefined;
  }

  const cards: ChangePointCardModel[] = [];

  for (const [entityLabel, { rows }] of groups.entries()) {
    const firstRow = rows[0];
    let lineEsql = buildChangePointLineDataQuery(esql);
    if (!lineEsql) continue;
    lineEsql = appendEntityFiltersToChangePointLineEsql(lineEsql, firstRow, entityColumnIds);

    const annotationEvents: ChangePointCardModel['annotationEvents'] = [];
    let minPvalue: number | undefined;
    const typesSeen = new Set<string>();
    for (const row of rows) {
      // BY mode: type/pvalue are absent from the schema; every row in the group is a change point.
      // Non-BY mode: only rows where type and pvalue are set are annotations.
      const isAnnotation = isByMode
        ? true
        : isChangePointTableRow(row, typeColumnId, pvalueColumnId);
      if (!isAnnotation) continue;
      const timeCell = pickTimestampCell(row, timeColumn, table, timestampReservedIds);
      const datetime = formatAnnotationTimestamp(timeCell);
      if (!datetime) continue;

      const label = isByMode
        ? i18n.translate('changePointChartViewer.card.changePointLabel', {
            defaultMessage: 'Change point',
          })
        : `${serializeCell(row[typeColumnId])} (pvalue=${formatPvalueLabel(row[pvalueColumnId])})`;
      annotationEvents.push({ name: label, datetime });
      // Track the most significant (lowest) pvalue and distinct types for sorting/filtering.
      if (!isByMode) {
        const p = row[pvalueColumnId];
        if (typeof p === 'number' && Number.isFinite(p)) {
          minPvalue = minPvalue === undefined ? p : Math.min(minPvalue, p);
        }
        const t = row[typeColumnId];
        if (typeof t === 'string' && t.length > 0) typesSeen.add(t);
      }
    }

    // Split queries: skip entity groups that have no change point annotations.
    // No-split queries: always include the single card even with zero annotations.
    if (isSplitQuery && annotationEvents.length === 0) continue;

    const cardOrdinal = cards.length + 1;
    const title =
      buildCardTitle(byColumns, entityColumnIds, firstRow) ||
      i18n.translate('changePointChartViewer.card.defaultTitleN', {
        defaultMessage: 'Change point series {ordinal}',
        values: { ordinal: cardOrdinal },
      });

    const entityValues: Record<string, string> = {};
    for (const col of entityColumnIds) {
      entityValues[col] = serializeCell(firstRow[col]);
    }

    const entityDescription =
      entityColumnIds.length > 0
        ? entityColumnIds.map((col) => `${col}: ${entityValues[col]}`).join(', ')
        : undefined;

    cards.push({
      // Use entity label as the stable card ID so React remounts when the entity changes.
      id: `cp-card-${entityLabel || 'all'}`,
      title,
      lineEsql,
      byColumns: byColumns ? [...byColumns] : undefined,
      annotationEvents,
      minPvalue,
      changePointTypes: [...typesSeen],
      entityValues,
      entityDescription,
    });
  }

  return cards.length > 0 ? cards : undefined;
};
