/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { getChangePointEntityFieldName, getChangePointOutputColumnNames } from '@kbn/esql-utils';
import type { ForkBranchLabel } from '@kbn/esql-utils';
import type { TimeRange } from '@kbn/es-query';
import dateMath from '@kbn/datemath';
import type {
  BurstDetectionHistogramBucket,
  ChangePointResult,
  DataLayerLike,
  RecordLike,
  TimeInterval,
} from './types';
import {
  CHANGE_POINT_TOOLTIP_ANNOTATION_LAYER_ID,
  DEFAULT_PVALUE_WHEN_MISSING,
  FORK_COLUMN_ID,
  MS_PER_HOUR,
  MS_PER_DAY,
  MS_PER_MONTH,
} from './constants';

/** Advance a moment by one unit of the given interval. */
function advanceMomentByInterval(
  current: { add: (amount: number, unit: 'month' | 'day' | 'hour' | 'minute') => unknown },
  interval: TimeInterval
): void {
  const unitMap: Record<TimeInterval, 'month' | 'day' | 'hour' | 'minute'> = {
    month: 'month',
    day: 'day',
    hour: 'hour',
    minute: 'minute',
  };
  current.add(1, unitMap[interval]);
}

function getTimeBucketKey(ts: string, interval: TimeInterval): string {
  try {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    const parts = [
      d.getFullYear(),
      pad(d.getMonth() + 1),
      pad(d.getDate()),
      pad(d.getHours()),
      pad(d.getMinutes()),
    ];
    const len: Record<TimeInterval, number> = { month: 2, day: 3, hour: 4, minute: 5 };
    return parts.slice(0, len[interval]).join('-');
  } catch {
    return ts.slice(0, 16);
  }
}

/** Get a time bucket size ('minute' | 'hour' | 'day' | 'month') based on the time span of the change point results. */
export function getBestIntervalFromResults(results: ChangePointResult[]): TimeInterval {
  const timestamps = results
    .filter((r) => r.timestamp)
    .map((r) => new Date(r.timestamp).getTime())
    .filter((t) => !Number.isNaN(t));
  if (timestamps.length < 2) return 'month';
  const minTs = Math.min(...timestamps);
  const maxTs = Math.max(...timestamps);
  const spanMs = maxTs - minTs;
  if (spanMs <= 2 * MS_PER_HOUR) return 'minute';
  if (spanMs <= 2 * MS_PER_DAY) return 'hour';
  if (spanMs <= 2 * MS_PER_MONTH) return 'day';
  return 'month';
}

const TIME_BUCKET_LABEL_OPTIONS: Record<TimeInterval, Intl.DateTimeFormatOptions> = {
  month: { month: 'short', year: '2-digit' },
  day: { month: 'short', day: 'numeric' },
  hour: { month: 'short', day: 'numeric', hour: '2-digit' },
  minute: { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
};

/** Get time bucket key and label based on interval. */
export function getTimeBucket(ts: string, interval: TimeInterval): { key: string; label: string } {
  try {
    const d = new Date(ts);
    const key = getTimeBucketKey(ts, interval);
    const label = d.toLocaleDateString(undefined, TIME_BUCKET_LABEL_OPTIONS[interval]);
    return { key, label };
  } catch {
    return { key: ts, label: ts.slice(0, 16) };
  }
}

/** Generate time buckets for the full date range at the given interval. */
export function getTimeBucketsForRange(
  timeRange: TimeRange,
  interval: TimeInterval
): Array<{ key: string; label: string }> {
  const fromMoment = dateMath.parse(timeRange.from);
  const toMoment = dateMath.parse(timeRange.to, { roundUp: true });
  if (!fromMoment?.isValid() || !toMoment?.isValid() || fromMoment.isAfter(toMoment)) return [];

  const buckets: Array<{ key: string; label: string }> = [];
  const current = fromMoment.clone();

  while (current.isSameOrBefore(toMoment)) {
    const d = current.toDate();
    const ts = d.toISOString();
    const { key, label } = getTimeBucket(ts, interval);
    if (buckets.length === 0 || buckets[buckets.length - 1].key !== key) {
      buckets.push({ key, label });
    }
    advanceMomentByInterval(current, interval);
  }

  return buckets;
}

/** Get unique time buckets from results at the given interval, sorted by key. */
export function getBucketsFromResults(
  results: ChangePointResult[],
  interval: TimeInterval
): Array<{ key: string; label: string }> {
  const bucketMap = new Map<string, { key: string; label: string }>();
  for (const r of results) {
    if (!r.timestamp) continue;
    const { key, label } = getTimeBucket(r.timestamp, interval);
    bucketMap.set(key, { key, label });
  }
  return [...bucketMap.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Build burst detection histogram: X = time bucket (timeline), Y = entities with change point (stacked by entity).
 * Returns one row per (timeBucket, entity) with y=1 when entity had a change point in that bucket.
 */
export function getBurstDetectionHistogram(
  results: ChangePointResult[],
  entityLabels: string[],
  timeRange?: { from: string; to: string }
): BurstDetectionHistogramBucket[] {
  const validResults = results.filter((r) => r.forkIndex !== undefined && r.timestamp);
  if (validResults.length === 0 || entityLabels.length === 0) return [];

  const interval = getBestIntervalFromResults(validResults);
  const bucketToTimestamp = new Map<string, number>();
  const bucketToEntities = new Map<string, Set<number>>();

  const addToBucket = (key: string, ts: string, entityIdx: number) => {
    const d = new Date(ts);
    const ms = d.getTime();
    if (!bucketToTimestamp.has(key)) bucketToTimestamp.set(key, ms);
    let set = bucketToEntities.get(key);
    if (!set) {
      set = new Set();
      bucketToEntities.set(key, set);
    }
    set.add(entityIdx);
  };

  for (const r of validResults) {
    const key = getTimeBucketKey(r.timestamp!, interval);
    addToBucket(key, r.timestamp!, r.forkIndex!);
  }

  if (timeRange?.from && timeRange?.to) {
    const fromMoment = dateMath.parse(timeRange.from);
    const toMoment = dateMath.parse(timeRange.to, { roundUp: true });
    if (fromMoment?.isValid() && toMoment?.isValid()) {
      const current = fromMoment.clone();
      while (current.isSameOrBefore(toMoment)) {
        const ts = current.toDate().toISOString();
        const key = getTimeBucketKey(ts, interval);
        if (!bucketToTimestamp.has(key)) {
          bucketToTimestamp.set(key, current.valueOf());
          bucketToEntities.set(key, new Set());
        }
        advanceMomentByInterval(current, interval);
      }
    }
  }

  const keys = [...bucketToTimestamp.keys()].sort();
  const data: BurstDetectionHistogramBucket[] = [];
  for (const key of keys) {
    const ts = bucketToTimestamp.get(key)!;
    const entities = bucketToEntities.get(key) ?? new Set();
    for (const entityIdx of entities) {
      const label = entityLabels[entityIdx] ?? `Entity ${entityIdx}`;
      data.push({ x: ts, g: label, y: 1 });
    }
  }
  return data;
}

/** Format annotation tooltip label: type, optional p-value, optional entity. */
export function formatChangePointAnnotationLabel(
  type: string | undefined,
  pvalue: number | null | undefined,
  entity?: string
): string {
  const typeLabel = type ?? 'Change point';
  const parts: string[] = [];
  if (entity) parts.push(entity);
  if (pvalue != null && !Number.isNaN(pvalue)) {
    const pvalStr = pvalue < 0.01 ? pvalue.toExponential(2) : pvalue.toFixed(4);
    parts.push(`p-value: ${pvalStr}`);
  }
  if (parts.length === 0) return typeLabel;
  return `${typeLabel} (${parts.join(', ')})`;
}

/**
 * Apply line chart styling to source data layers (line series, subdued color).
 */
export function applyLineChartStyleToDataLayers(
  layers: DataLayerLike[],
  sourceLineColor: string
): DataLayerLike[] {
  return layers.map((layer) => {
    if (layer.layerType !== 'data' || !layer.accessors?.length) return layer;
    const yConfig = layer.accessors.map((forAccessor) => ({
      forAccessor,
      color: sourceLineColor,
    }));
    return { ...layer, seriesType: 'line', yConfig };
  });
}

/**
 * Derive per-entity Lens attributes from full fork chart attributes.
 * Keeps only the data layer and annotation layer for the entity. Prefers
 * extracting the annotation layer from the full chart; falls back to building
 * from entityResults if not found.
 */
export function deriveEntityAttributes(
  fullAttributes: TypedLensByValueInput['attributes'],
  entityIndex: number,
  entityResults: ChangePointResult[],
  entityLabel: string,
  dataViewId: string,
  forkLineColors: string[]
): TypedLensByValueInput['attributes'] | null {
  const dataLayerId = `fork-branch-${entityIndex}`;
  const annotationLayerId = `${CHANGE_POINT_TOOLTIP_ANNOTATION_LAYER_ID}-branch-${entityIndex}`;
  const textBased = fullAttributes.state?.datasourceStates?.textBased as
    | { layers?: Record<string, unknown> }
    | undefined;
  const dsLayers = textBased?.layers;
  const visLayers =
    (fullAttributes.state?.visualization as { layers?: DataLayerLike[] })?.layers ?? [];
  if (!dsLayers?.[dataLayerId]) return null;
  const dataLayer = visLayers.find((l) => l.layerId === dataLayerId);
  if (!dataLayer) return null;

  const entityLayers: DataLayerLike[] = [dataLayer];
  let annotationLayer = visLayers.find(
    (l: DataLayerLike) => l.layerId === annotationLayerId && l.layerType === 'annotations'
  ) as DataLayerLike | undefined;

  if (!annotationLayer && entityResults.length > 0) {
    const color = forkLineColors[entityIndex % forkLineColors.length] ?? forkLineColors[0];
    const dataLayerIndex = (dsLayers[dataLayerId] as { index?: string })?.index;
    const effectiveIndexPatternId = dataLayerIndex ?? dataViewId;
    const annotations = entityResults.map((r, idx) => {
      const timestamp = (() => {
        try {
          return new Date(r.timestamp).toISOString();
        } catch {
          return r.timestamp;
        }
      })();
      return {
        id: `change-point-annotation-b${entityIndex}-${idx}`,
        type: 'manual' as const,
        icon: 'triangle' as const,
        textVisibility: true,
        label: formatChangePointAnnotationLabel(r.type, r.pvalue ?? null),
        key: { type: 'point_in_time' as const, timestamp },
        isHidden: false,
        color,
        lineStyle: 'solid' as const,
        lineWidth: 1,
        outside: false,
      };
    });
    annotationLayer = {
      layerId: annotationLayerId,
      layerType: 'annotations' as const,
      indexPatternId: effectiveIndexPatternId,
      annotations,
      ignoreGlobalFilters: true,
    } as DataLayerLike;
  }

  if (annotationLayer) {
    // Strip entity from annotation labels (redundant in per-entity mini charts)
    const entitySuffix = ` (${entityLabel})`;
    const entityInParens = ` (${entityLabel}, `;
    const entityComma = `, ${entityLabel})`;
    const annotations = (annotationLayer.annotations ?? []) as Array<{ label?: string }>;
    annotationLayer = {
      ...annotationLayer,
      annotations: annotations.map((a) => {
        let label = a.label ?? '';
        if (label.endsWith(entitySuffix)) {
          label = label.slice(0, -entitySuffix.length);
        } else if (label.includes(entityInParens)) {
          label = label.replace(entityInParens, ' (');
        } else if (label.includes(entityComma)) {
          label = label.replace(entityComma, ')');
        }
        return { ...a, label };
      }),
    } as DataLayerLike;
    entityLayers.push(annotationLayer);
  }

  // Use metric field name in tooltip instead of entity (redundant in per-entity mini charts)
  const dsLayer = dsLayers[dataLayerId] as {
    columns?: Array<{
      columnId?: string;
      fieldName?: string;
      label?: string;
      customLabel?: boolean;
    }>;
  };
  const valueAccessors = new Set(dataLayer.accessors ?? []);
  const dsLayerWithMetricLabel = dsLayer?.columns
    ? {
        ...dsLayer,
        columns: dsLayer.columns.map((col) =>
          valueAccessors.has(col.columnId ?? '')
            ? { ...col, customLabel: false, label: col.fieldName ?? col.label }
            : col
        ),
      }
    : dsLayer;

  return {
    ...fullAttributes,
    state: {
      ...fullAttributes.state,
      datasourceStates: {
        ...fullAttributes.state?.datasourceStates,
        textBased: {
          ...textBased,
          layers: { [dataLayerId]: dsLayerWithMetricLabel },
        },
      },
      visualization: {
        ...(fullAttributes.state?.visualization as object),
        layers: entityLayers,
      },
    } as TypedLensByValueInput['attributes']['state'],
  };
}

/**
 * Build change point results from doc viewer records (e.g. textBasedHits).
 * Uses columns + columnsMeta to resolve time/type/pvalue/value column ids.
 * Includes every record (one result per record) so indices align with the hit list.
 * Rows without a p-value are included as long as they have a timestamp, so before/after
 * values can be taken from adjacent rows that may not be change points.
 */
export function getChangePointResultsFromRecords(
  records: RecordLike[],
  columns: string[],
  columnsMeta: Record<string, { type?: string }> | undefined,
  query: { esql?: string }
): { results: ChangePointResult[]; metricLabel: string } {
  const columnNames = getChangePointOutputColumnNames(query?.esql);
  const typeColumnId =
    columnNames && columns.includes(columnNames.typeColumn) ? columnNames.typeColumn : undefined;
  const pvalueColumnId =
    columnNames && columns.includes(columnNames.pvalueColumn)
      ? columnNames.pvalueColumn
      : undefined;
  const timeColumnId =
    columns.find(
      (id) =>
        columnsMeta?.[id]?.type === 'date' ||
        (typeof columnsMeta?.[id]?.type === 'string' &&
          String(columnsMeta?.[id]?.type).startsWith('date'))
    ) ?? columns[0];
  let valueColumnId = columns.find(
    (id) =>
      id !== timeColumnId &&
      id !== typeColumnId &&
      id !== pvalueColumnId &&
      columnsMeta?.[id]?.type === 'number'
  );
  if (!valueColumnId) {
    valueColumnId = columns.find(
      (id) => id !== timeColumnId && id !== typeColumnId && id !== pvalueColumnId
    );
  }
  const metricLabel = valueColumnId ?? '';

  if (!timeColumnId) {
    return { results: [], metricLabel };
  }

  const skipColumnIds = new Set([timeColumnId, typeColumnId, pvalueColumnId].filter(Boolean));

  const results: ChangePointResult[] = [];
  for (const rec of records) {
    const row = rec.flattened ?? {};
    const ts = row[timeColumnId];
    const timestamp = timestampToIso(ts) ?? '';
    const typeVal = typeColumnId ? row[typeColumnId] : undefined;
    const pval = pvalueColumnId != null ? row[pvalueColumnId] : undefined;
    let rawVal = valueColumnId != null ? row[valueColumnId] : undefined;
    if (rawVal === undefined && row && typeof row === 'object') {
      for (const k of Object.keys(row)) {
        if (skipColumnIds.has(k)) continue;
        const v = row[k];
        if (v != null && (typeof v === 'number' || !Number.isNaN(Number(v)))) {
          rawVal = v;
          break;
        }
      }
    }
    const value =
      rawVal != null && (typeof rawVal === 'number' || !Number.isNaN(Number(rawVal)))
        ? Number(rawVal)
        : undefined;
    results.push({
      timestamp,
      type: typeVal != null ? String(typeVal) : undefined,
      pvalue: pval != null && pval !== '' ? Number(pval) : undefined,
      value,
    });
  }
  return { results, metricLabel };
}

/** Read cell value from a row; rows may be keyed by column id, column name, or raw keys; or arrays by index. */
export function getRowValue(
  row: Record<string, unknown> | unknown[],
  columnId: string,
  table: Datatable
): unknown {
  const col = table.columns.find((c) => c.id === columnId || c.name === columnId);
  if (!col) return undefined;
  if (Array.isArray(row)) {
    const idx = table.columns.findIndex((c) => c.id === columnId || c.name === columnId);
    return idx >= 0 ? row[idx] : undefined;
  }
  let val = (row as Record<string, unknown>)[col.id] ?? (row as Record<string, unknown>)[col.name];
  if (val === undefined && row && typeof row === 'object' && !Array.isArray(row)) {
    const target = (col.name ?? col.id ?? '').toLowerCase();
    const targetNorm = target.replace(/_/g, '');
    const key = Object.keys(row as Record<string, unknown>).find(
      (k) =>
        k.toLowerCase() === target ||
        k.toLowerCase().replace(/_/g, '') === targetNorm ||
        (targetNorm === 'fork' && k.toLowerCase().includes('fork'))
    );
    if (key) val = (row as Record<string, unknown>)[key];
  }
  return val;
}

function getColumnId(col: DatatableColumn | undefined): string | undefined {
  return col?.id ?? col?.name;
}

/** Known column names for CHANGE_POINT output (defaults and common AS renames). */
const CHANGE_POINT_TYPE_COLUMN_NAMES = ['type', 'change_type', 'changeType'];
const CHANGE_POINT_PVALUE_COLUMN_NAMES = ['pvalue', 'p_value', 'pValue'];

/**
 * Resolves type and pvalue column IDs from table columns by matching known CHANGE_POINT output names.
 * Uses fetchParams columns; no query parsing needed.
 */
export function getChangePointColumnIdsFromColumns(columns: DatatableColumn[]): {
  typeColumnId?: string;
  pvalueColumnId?: string;
} {
  const typeCol = columns.find((c) => {
    const id = (c.id ?? c.name ?? '').toLowerCase();
    return CHANGE_POINT_TYPE_COLUMN_NAMES.some((n) => id === n.toLowerCase());
  });
  const pvalueCol = columns.find((c) => {
    const id = (c.id ?? c.name ?? '').toLowerCase();
    return CHANGE_POINT_PVALUE_COLUMN_NAMES.some((n) => id === n.toLowerCase());
  });
  return {
    typeColumnId: getColumnId(typeCol),
    pvalueColumnId: getColumnId(pvalueCol),
  };
}

/** ES|QL date columns may use meta.type 'date' or 'date_nanos'; columns may have id or name. */
export function getTimeColumnId(columns: DatatableColumn[]): string | undefined {
  const dateCol = columns.find(
    (c) =>
      c.meta?.type === 'date' ||
      (typeof c.meta?.type === 'string' && c.meta.type.startsWith('date')) ||
      (c as { type?: string }).type === 'date'
  );
  if (dateCol) return getColumnId(dateCol);
  if (columns.length > 0) return getColumnId(columns[0]);
  return undefined;
}

/**
 * Derives entities from the ES|QL query and change point result table.
 * Uses the query to find the entity field name (e.g. the BY field that is not the time dimension),
 * then extracts unique values from the table for that column.
 * @param esql - The full ES|QL query string
 * @param table - The change point result datatable
 * @returns Array of { branchIndex, branchLabel } for each entity, or undefined when no entity field
 */
export function getEntitiesFromChangePointData(
  esql: string | undefined,
  table: Datatable
): ForkBranchLabel[] | undefined {
  if (!esql || !table?.rows?.length) return undefined;

  const entityFieldName = getChangePointEntityFieldName(esql);
  if (!entityFieldName) return undefined;

  const entityCol = table.columns.find((c) => (c.id ?? c.name) === entityFieldName);
  const entityColumnId = getColumnId(entityCol);
  if (!entityColumnId) return undefined;

  const seen = new Map<string, number>();
  const order: string[] = [];
  for (const row of table.rows) {
    const val = getRowValue(row as Record<string, unknown> | unknown[], entityColumnId, table);
    if (val != null && val !== '') {
      const str = String(val);
      if (!seen.has(str)) {
        seen.set(str, order.length);
        order.push(str);
      }
    }
  }

  if (order.length === 0) return undefined;

  return order.map((branchLabel, branchIndex) => ({
    branchIndex,
    branchLabel,
  }));
}

/** Find a column whose values match fork branch labels (e.g. provider matching entity URLs). */
function findEntityColumnMatchingBranchLabels(
  table: Datatable,
  forkBranches: Array<{ branchLabel: string }>
): string | undefined {
  const labels = new Set(forkBranches.map((b) => b.branchLabel));
  let bestColId: string | undefined;
  let bestMatchCount = 0;
  for (const col of table.columns) {
    const colId = getColumnId(col);
    if (!colId) continue;
    let matchCount = 0;
    for (const row of table.rows) {
      const val = getRowValue(row as Record<string, unknown>, colId, table);
      if (val != null && labels.has(String(val))) matchCount++;
    }
    if (matchCount > bestMatchCount) {
      bestMatchCount = matchCount;
      bestColId = colId;
    }
  }
  return bestColId;
}

export interface ForkColumnMetaForChangePoint {
  hasForkColumn: boolean;
  effectiveForkColumnId: string | undefined;
  entityColumnByBranchLabel: string | undefined;
}

export function getForkColumnMetaForChangePointTable(
  table: Datatable,
  forkColumnId?: string,
  forkBranches?: Array<{ branchLabel: string }>
): ForkColumnMetaForChangePoint {
  const forkCol = forkColumnId
    ? table.columns.find(
        (c) =>
          c.id === forkColumnId ||
          c.name === forkColumnId ||
          c.id === '_fork' ||
          c.name === '_fork' ||
          (typeof c.name === 'string' && c.name.toLowerCase().includes('fork'))
      )
    : undefined;
  const hasForkColumn = Boolean(forkCol);
  const effectiveForkColumnId = forkCol?.id ?? forkCol?.name ?? forkColumnId;
  const entityColumnByBranchLabel =
    !hasForkColumn && forkBranches?.length
      ? findEntityColumnMatchingBranchLabels(table, forkBranches)
      : undefined;
  return { hasForkColumn, effectiveForkColumnId, entityColumnByBranchLabel };
}

export function resolveForkIndexForChangePointRow(
  rowRecord: Record<string, unknown> | unknown[],
  table: Datatable,
  meta: ForkColumnMetaForChangePoint,
  forkBranches?: Array<{ branchLabel: string }>
): number | undefined {
  let forkIndex: number | undefined;
  if (meta.hasForkColumn && meta.effectiveForkColumnId) {
    const forkVal = getRowValue(rowRecord, meta.effectiveForkColumnId, table);
    if (typeof forkVal === 'number' && Number.isInteger(forkVal)) {
      forkIndex = forkVal > 0 ? forkVal - 1 : forkVal;
    } else if (typeof forkVal === 'string') {
      const match = forkVal.match(/^fork(\d+)$/i);
      if (match) forkIndex = parseInt(match[1], 10) - 1;
    }
  } else if (meta.entityColumnByBranchLabel) {
    const entityVal = getRowValue(rowRecord, meta.entityColumnByBranchLabel, table);
    const idx =
      entityVal != null && forkBranches
        ? forkBranches.findIndex(
            (b) =>
              String(entityVal) === b.branchLabel || String(entityVal) === String(b.branchLabel)
          )
        : -1;
    if (idx >= 0) forkIndex = idx;
  }
  return forkIndex;
}

/** Map _fork / entity value to entityAttributesMap key (array index in forkBranchLabels). */
export function mapForkIndexToEntityChartKey(
  forkIndex: number | undefined,
  forkBranchLabels: ForkBranchLabel[]
): number | undefined {
  if (forkIndex == null || forkBranchLabels.length === 0) return undefined;
  if (forkIndex >= 0 && forkIndex < forkBranchLabels.length) {
    return forkIndex;
  }
  const byBranchIndex = forkBranchLabels.findIndex((b) => b.branchIndex === forkIndex);
  return byBranchIndex >= 0 ? byBranchIndex : undefined;
}

/**
 * Document flyout chart only for rows that look like real CHANGE_POINT hits:
 * valid time, non-null p-value, and non-null type (when those columns exist).
 */
export function rowIsQualifyingChangePointForDocChart(
  rowRecord: Record<string, unknown> | unknown[],
  table: Datatable,
  timeColumnId: string | undefined,
  typeColumnId: string | undefined,
  pvalueColumnId: string | undefined
): boolean {
  if (!timeColumnId) return false;
  const ts = getRowValue(rowRecord, timeColumnId, table);
  if (!timestampToIso(ts)) return false;
  if (!pvalueColumnId) return false;
  const pval = getRowValue(rowRecord, pvalueColumnId, table);
  if (pval === null || pval === undefined) return false;
  if (!typeColumnId) return false;
  const typeVal = getRowValue(rowRecord, typeColumnId, table);
  if (typeVal === null || typeVal === undefined) return false;
  return true;
}

/**
 * Maps each ES|QL table row index to the same per-entity Lens attributes used in the
 * multiple-line chart ({@link DataTableRecord.id} is String(rowIndex) in fetch_esql).
 * Only rows that pass {@link rowIsQualifyingChangePointForDocChart} get an entry.
 */
export function buildChangePointLensAttributesByRecordId(
  table: Datatable | undefined,
  colsToUse: DatatableColumn[],
  changePointColumnIds: { typeColumnId?: string; pvalueColumnId?: string },
  forkBranchLabels: ForkBranchLabel[] | undefined,
  entityAttributesMap: Record<number, TypedLensByValueInput['attributes']>,
  lensAttributes: TypedLensByValueInput['attributes'] | null,
  multipleEntityMode: boolean
): Record<string, TypedLensByValueInput['attributes']> {
  const out: Record<string, TypedLensByValueInput['attributes']> = {};
  if (!table?.rows?.length || !lensAttributes) {
    return out;
  }

  const timeColumnId = getTimeColumnId(colsToUse);
  const { typeColumnId, pvalueColumnId } = changePointColumnIds;

  if (!multipleEntityMode) {
    for (let i = 0; i < table.rows.length; i++) {
      const rowRecord = table.rows[i] as Record<string, unknown> | unknown[];
      if (
        rowIsQualifyingChangePointForDocChart(
          rowRecord,
          table,
          timeColumnId,
          typeColumnId,
          pvalueColumnId
        )
      ) {
        out[String(i)] = lensAttributes;
      }
    }
    return out;
  }

  if (!forkBranchLabels?.length) {
    return out;
  }

  const valueColumnId = timeColumnId
    ? getValueColumnId(colsToUse, timeColumnId, typeColumnId, pvalueColumnId)
    : undefined;
  if (!timeColumnId || !valueColumnId) {
    return out;
  }

  const forkMeta = getForkColumnMetaForChangePointTable(table, FORK_COLUMN_ID, forkBranchLabels);

  table.rows.forEach((row, rowIndex) => {
    const rowRecord = row as Record<string, unknown> | unknown[];
    if (
      !rowIsQualifyingChangePointForDocChart(
        rowRecord,
        table,
        timeColumnId,
        typeColumnId,
        pvalueColumnId
      )
    ) {
      return;
    }

    const forkIndex = resolveForkIndexForChangePointRow(
      rowRecord,
      table,
      forkMeta,
      forkBranchLabels
    );
    const entityKey = mapForkIndexToEntityChartKey(forkIndex, forkBranchLabels);
    if (entityKey == null) return;
    const attrs = entityAttributesMap[entityKey];
    if (attrs) {
      out[String(rowIndex)] = attrs;
    }
  });

  return out;
}

/**
 * Build change point results from the query result table (time, type, pvalue, value columns).
 * Excludes rows where pvalue is null when the pvalue column is present.
 * When forkColumnId is provided (e.g. _fork), includes forkIndex for each result.
 * When _fork is missing but forkBranches provided, matches column values to branchLabel for entity.
 * Table rows may be objects keyed by column id/name or arrays by column index.
 */
export function getChangePointResultsFromTable(
  table: Datatable,
  timeColumnId: string,
  typeColumnId: string | undefined,
  pvalueColumnId: string | undefined,
  valueColumnId: string | undefined,
  forkColumnId?: string,
  forkBranches?: Array<{ branchLabel: string }>
): ChangePointResult[] {
  const hasTimeColumn = table.columns.some((c) => (c.id ?? c.name) === timeColumnId);
  if (!hasTimeColumn) return [];

  const forkMeta = getForkColumnMetaForChangePointTable(table, forkColumnId, forkBranches);

  const results: ChangePointResult[] = [];
  for (const row of table.rows) {
    const rowRecord = row as Record<string, unknown> | unknown[];
    const ts = getRowValue(rowRecord, timeColumnId, table);
    const timestamp = timestampToIso(ts);
    if (!timestamp) continue;
    if (pvalueColumnId) {
      const pval = getRowValue(rowRecord, pvalueColumnId, table);
      if (pval === null || pval === undefined) continue;
    }

    const typeVal = typeColumnId ? getRowValue(rowRecord, typeColumnId, table) : undefined;
    const pval = pvalueColumnId ? getRowValue(rowRecord, pvalueColumnId, table) : undefined;
    const val = valueColumnId ? getRowValue(rowRecord, valueColumnId, table) : undefined;
    const forkIndex = resolveForkIndexForChangePointRow(rowRecord, table, forkMeta, forkBranches);
    const pvalueNum = pval != null ? Number(pval) : undefined;
    results.push({
      timestamp,
      type: typeVal != null ? String(typeVal) : undefined,
      pvalue: pvalueNum ?? (val != null ? DEFAULT_PVALUE_WHEN_MISSING : undefined),
      value: val != null && typeof val === 'number' ? val : undefined,
      forkIndex,
    });
  }
  return results;
}

/** First numeric column that is not time, type, or pvalue (the metric value column). */
export function getValueColumnId(
  columns: DatatableColumn[],
  timeColumnId: string,
  typeColumnId: string | undefined,
  pvalueColumnId: string | undefined
): string | undefined {
  const col = columns.find((c) => {
    const id = getColumnId(c);
    if (!id) return false;
    if (id === timeColumnId || id === typeColumnId || id === pvalueColumnId) return false;
    return c.meta?.type === 'number' || (c as { type?: string }).type === 'double';
  });
  return getColumnId(col);
}

/** Normalize timestamps to ISO strings, while safely handling invalid or unsupported types. */
export function timestampToIso(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Date(value).toISOString();
  return undefined;
}
