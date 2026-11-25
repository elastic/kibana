/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PaletteOutput, PaletteRegistry, CustomPaletteParams, ColorStop } from '@kbn/coloring';
import {
  getPaletteStops,
  reversePalette,
  CUSTOM_PALETTE,
  DEFAULT_MAX_STOP,
  DEFAULT_MIN_STOP,
} from '@kbn/coloring';
import { getOriginalId } from '@kbn/transpose-utils';

import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/public';
import type { FormatFactory, IFieldFormat } from '@kbn/field-formats-plugin/common';
import { getLowerBound } from '@kbn/chart-expressions-common';
import { defaultPaletteParams } from '../constants';
import type { HeatmapSortPredicate } from '../../common/types';

export function getDataMinMax(
  rangeType: CustomPaletteParams['rangeType'] | undefined,
  dataBounds: { min: number; max: number }
) {
  const dataMin = rangeType === 'number' ? dataBounds.min : DEFAULT_MIN_STOP;
  const dataMax = rangeType === 'number' ? dataBounds.max : DEFAULT_MAX_STOP;
  return { min: dataMin, max: dataMax };
}
// Utility to remap color stops within new domain
export function remapStopsByNewInterval(
  controlStops: ColorStop[],
  {
    newInterval,
    oldInterval,
    newMin,
    oldMin,
  }: { newInterval: number; oldInterval: number; newMin: number; oldMin: number }
) {
  return (controlStops || []).map(({ color, stop }) => {
    return {
      color,
      stop: newMin + ((stop - oldMin) * newInterval) / oldInterval,
    };
  });
}

/**
 * Some name conventions here:
 * * `displayStops` => It's an additional transformation of `stops` into a [0, N] domain for the EUIPaletteDisplay component.
 * * `stops` => final steps used to table coloring. It is a rightShift of the colorStops
 * * `colorStops` => user's color stop inputs.  Used to compute range min.
 *
 * When the user inputs the colorStops, they are designed to be the initial part of the color segment,
 * so the next stops indicate where the previous stop ends.
 * Both table coloring logic and EuiPaletteDisplay format implementation works differently than our current `colorStops`,
 * by having the stop values at the end of each color segment rather than at the beginning: `stops` values are computed by a rightShift of `colorStops`.
 * EuiPaletteDisplay has an additional requirement as it is always mapped against a domain [0, N]: from `stops` the `displayStops` are computed with
 * some continuity enrichment and a remap against a [0, 100] domain to make the palette component work ok.
 *
 * These naming conventions would be useful to track the code flow in this feature as multiple transformations are happening
 * for a single change.
 */

export function applyPaletteParams<T extends PaletteOutput<CustomPaletteParams>>(
  palettes: PaletteRegistry,
  activePalette: T,
  dataBounds: { min: number; max: number }
) {
  // make a copy of it as they have to be manipulated later on
  let displayStops = getPaletteStops(palettes, activePalette?.params || {}, {
    dataBounds,
    defaultPaletteName: activePalette?.name ?? defaultPaletteParams.name,
  });

  if (activePalette?.params?.reverse && activePalette?.params?.name !== CUSTOM_PALETTE) {
    displayStops = reversePalette(displayStops);
  }
  return displayStops;
}

export function getNumericValue(rowValue: number | number[] | undefined) {
  if (rowValue == null || Array.isArray(rowValue)) {
    return;
  }
  return rowValue;
}

export const findMinMaxByColumnId = (columnIds: string[], table: Datatable | undefined) => {
  const minMax: Record<string, { min: number; max: number; fallback?: boolean }> = {};

  if (table != null) {
    for (const columnId of columnIds) {
      const originalId = getOriginalId(columnId);
      minMax[originalId] = minMax[originalId] || { max: -Infinity, min: Infinity };
      table.rows.forEach((row) => {
        const rowValue = row[columnId];
        const numericValue = getNumericValue(rowValue);
        if (numericValue != null) {
          if (minMax[originalId].min > numericValue) {
            minMax[originalId].min = numericValue;
          }
          if (minMax[originalId].max < numericValue) {
            minMax[originalId].max = numericValue;
          }
        }
      });
      // what happens when there's no data in the table? Fallback to a percent range
      if (minMax[originalId].max === -Infinity) {
        minMax[originalId] = { max: 100, min: 0, fallback: true };
      }
    }
  }
  return minMax;
};

/** Numeric key, or the lower bound of an ES|QL range such as "0.4..0.45". */
const bucketLowerBound = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    // typeof NaN and Infinity is 'number'; neither is a histogram step.
    return Number.isFinite(value) ? value : undefined;
  }
  // Categorical labels stay out. getLowerBound('10') would otherwise become 10.
  if (typeof value !== 'string' || !value.includes('..')) {
    return undefined;
  }
  const lower = getLowerBound(value);
  return Number.isFinite(lower) ? lower : undefined;
};

/** Inserts blank Y rows for missing numeric-histogram steps, using the original interval width. */
export const fillMissingHeatmapYBuckets = (
  rows: Datatable['rows'],
  yAccessor: string | undefined,
  valueAccessor: string | undefined,
  interval: number | undefined
): Datatable['rows'] => {
  if (!yAccessor || !valueAccessor || interval == null || !(interval > 0) || rows.length === 0) {
    return rows;
  }

  const rowIndexes = rows.map((row) => {
    const y = bucketLowerBound(row[yAccessor]);
    return y == null ? undefined : Math.round(y / interval);
  });
  const templatePosition = rowIndexes.findIndex((index) => index != null);
  if (templatePosition === -1) {
    return rows;
  }
  const template = rows[templatePosition];

  const presentIndexes = [...new Set(rowIndexes)]
    .filter((index): index is number => index != null)
    .sort((a, b) => a - b);
  const minIndex = presentIndexes[0];
  const maxIndex = presentIndexes[presentIndexes.length - 1];
  if (
    presentIndexes.length === maxIndex - minIndex + 1 ||
    !Number.isSafeInteger(minIndex) ||
    !Number.isSafeInteger(maxIndex)
  ) {
    return rows;
  }

  const presentIndexSet = new Set(presentIndexes);
  const yIsRange = typeof template[yAccessor] === 'string';
  const inserted = new Set<number>();
  let coveredSpans: Array<{ low: number; high: number }> = [];
  const spanIsCovered = (low: number, high: number) =>
    coveredSpans.some((span) => span.low <= low && span.high >= high);
  const coverSpan = (low: number, high: number) => {
    let mergedLow = low;
    let mergedHigh = high;
    const remaining: Array<{ low: number; high: number }> = [];
    for (const span of coveredSpans) {
      if (span.high < mergedLow || span.low > mergedHigh) {
        remaining.push(span);
        continue;
      }
      mergedLow = Math.min(mergedLow, span.low);
      mergedHigh = Math.max(mergedHigh, span.high);
    }
    remaining.push({ low: mergedLow, high: mergedHigh });
    coveredSpans = remaining;
  };

  const filled: Datatable['rows'] = [];
  let previousIndex: number | undefined;
  for (let position = 0; position < rows.length; position++) {
    const row = rows[position];
    const index = rowIndexes[position];
    // Place each missing step between the buckets that surround it, following the
    // direction of the rows. The first histogram row is already written by then, so
    // the copied X value is on the axis and X order stays unchanged. A span that was
    // already walked, including the same gap crossed once per X value, is skipped.
    if (index != null && previousIndex != null && index !== previousIndex) {
      const low = Math.min(previousIndex, index);
      const high = Math.max(previousIndex, index);
      if (high - low > 1 && !spanIsCovered(low, high)) {
        const step = index > previousIndex ? 1 : -1;
        for (let bucketIndex = previousIndex + step; bucketIndex !== index; bucketIndex += step) {
          if (presentIndexSet.has(bucketIndex) || inserted.has(bucketIndex)) {
            continue;
          }
          inserted.add(bucketIndex);
          const lower = bucketIndex * interval;
          filled.push({
            ...template,
            [yAccessor]: yIsRange ? `${lower}..${(bucketIndex + 1) * interval}` : lower,
            [valueAccessor]: null,
          });
        }
        coverSpan(low, high);
      }
    }
    filled.push(row);
    if (index != null) {
      previousIndex = index;
    }
  }
  return filled;
};

export const getSortPredicate = (column: DatatableColumn, predicate?: HeatmapSortPredicate) => {
  // number ranges are already sorted by sortRowsByRangeLowerBound, the chart has to keep that order
  // required until comparator is introduced in https://github.com/elastic/elastic-charts/issues/2782
  if (!predicate || column.meta.type === 'number_range') {
    return 'dataIndex';
  }
  // for now sort only numerical types, and sort the rest as string.
  // TODO pass an external comparator to correctly handle other type of data
  // https://github.com/elastic/elastic-charts/issues/2782
  if (['number'].includes(column.meta.type)) {
    return predicate === 'asc' ? 'numAsc' : 'numDesc';
  } else {
    return predicate === 'asc' ? 'alphaAsc' : 'alphaDesc';
  }
};

const isPrimitive = (value: unknown): boolean => value != null && typeof value !== 'object';

export const getFormattedRow = (
  row: Datatable['rows'][number],
  columns: Datatable['columns'],
  columnsFormatters: Record<string, IFieldFormat>
): { row: Datatable['rows'][number]; formattedColumns: Record<string, true> } =>
  columns.reduce(
    (formattedInfo, { id }) => {
      const record = formattedInfo.row[id];
      if (
        record != null &&
        // pre-format non-primitive values
        !isPrimitive(record)
      ) {
        return {
          row: { ...formattedInfo.row, [id]: columnsFormatters[id]!.convertToText(record) },
          formattedColumns: { ...formattedInfo.formattedColumns, [id]: true },
        };
      }
      return formattedInfo;
    },
    { row, formattedColumns: {} }
  );

export const getFormattedTable = (
  table: Datatable,
  formatFactory: FormatFactory
): { table: Datatable; formattedColumns: Record<string, true> } => {
  const columnsFormatters = table.columns.reduce<Record<string, IFieldFormat>>(
    (formatters, { id, meta }) => {
      return {
        ...formatters,
        [id]: formatFactory(meta.params),
      };
    },
    {}
  );

  const formattedTableInfo: {
    rows: Datatable['rows'];
    formattedColumns: Record<string, true>;
  } = {
    rows: [],
    formattedColumns: {},
  };
  for (const row of table.rows) {
    const formattedRowInfo = getFormattedRow(row, table.columns, columnsFormatters);
    formattedTableInfo.rows.push(formattedRowInfo.row);
    formattedTableInfo.formattedColumns = {
      ...formattedTableInfo.formattedColumns,
      ...formattedRowInfo.formattedColumns,
    };
  }

  return {
    table: { ...table, rows: formattedTableInfo.rows },
    formattedColumns: formattedTableInfo.formattedColumns,
  };
};
