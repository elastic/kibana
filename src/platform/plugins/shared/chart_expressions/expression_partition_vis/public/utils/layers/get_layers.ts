/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Datum, PartitionLayer } from '@elastic/charts';
import type { ColorHandlingFn, PaletteRegistry } from '@kbn/coloring';
import { getColorFactory } from '@kbn/coloring';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { Datatable, DatatableRow } from '@kbn/expressions-plugin/public';

import { getColorCategories } from '@kbn/chart-expressions-common';
import type { KbnPalettes } from '@kbn/palettes';
import { getDistinctSeries } from '..';
import type { BucketColumns, PartitionVisParams } from '../../../common/types';
import { ChartTypes } from '../../../common/types';
import { sortPredicateByType, sortPredicateSaveSourceOrder } from './sort_predicate';
import { byDataColorPaletteMap, getColor } from './get_color';
import { getNodeLabel } from './get_node_labels';
import { getPartitionFillColor } from '../colors/color_mapping_accessors';

function getColorCategoriesForChart(
  chartType: ChartTypes,
  columns: Partial<BucketColumns>[],
  rows: DatatableRow[]
) {
  // the mosaic configures the main categories in the second column, instead of the first
  // as it happens in all the other partition types.
  // Independently from the bucket aggregation used, the categories will always be casted
  // as string to make it nicely working with a text input field, avoiding a field
  const accessor =
    chartType === ChartTypes.MOSAIC && columns.length === 2 ? columns[1]?.id : columns[0]?.id;
  return accessor ? getColorCategories(rows, [accessor]) : [];
}

export const getLayers = (
  chartType: ChartTypes,
  columns: Array<Partial<BucketColumns>>,
  visParams: PartitionVisParams,
  visData: Datatable,
  overwriteColors: { [key: string]: string } = {},
  rows: DatatableRow[],
  paletteService: PaletteRegistry | null,
  palettes: KbnPalettes,
  formatters: Record<string, FieldFormat | undefined>,
  formatter: FieldFormatsStart,
  syncColors: boolean,
  isDarkMode: boolean
): PartitionLayer[] => {
  const fillLabel: PartitionLayer['fillLabel'] = {
    valueFont: {
      fontWeight: 700,
    },
  };

  if (!visParams.labels.values) {
    fillLabel.valueFormatter = () => '';
  }
  const categories = getColorCategoriesForChart(chartType, columns, rows);
  const colorIndexMap = new Map(categories.map((c, i) => [String(c), i]));

  const isSplitChart = Boolean(visParams.dimensions.splitColumn || visParams.dimensions.splitRow);
  let byDataPalette: ReturnType<typeof byDataColorPaletteMap>;
  if (!syncColors && columns[1]?.id && paletteService && visParams.palette) {
    byDataPalette = byDataColorPaletteMap(
      paletteService?.get(visParams.palette.name),
      visParams.palette,
      colorIndexMap
    );
  }

  const sortPredicateForType = sortPredicateByType(chartType, visParams, visData, columns);

  const distinctSeries = getDistinctSeries(rows, columns);

  // return a fn only if color mapping is available in visParams
  const getColorFromMappingFn = getColorFromMappingFactory(
    chartType,
    columns,
    rows,
    palettes,
    visParams,
    isDarkMode
  );

  return columns.map((col, layerIndex) => {
    return {
      groupByRollup: (d: Datum) => (col.id ? d[col.id] : col.name),
      showAccessor: (d: Datum) => true,
      nodeLabel: (d: unknown) => getNodeLabel(d, col, formatters, formatter.deserialize),
      fillLabel:
        layerIndex === 0 && chartType === ChartTypes.MOSAIC
          ? { ...fillLabel, minFontSize: 14, maxFontSize: 14, clipText: true }
          : fillLabel,
      sortPredicate: col.meta?.sourceParams?.consolidatedMetricsColumn
        ? sortPredicateSaveSourceOrder()
        : sortPredicateForType,
      shape: {
        // this applies color mapping only if visParams.colorMapping is available
        fillColor: getColorFromMappingFn
          ? getPartitionFillColor(chartType, layerIndex, columns.length, getColorFromMappingFn)
          : (key, sortIndex, node) =>
              getColor(
                chartType,
                key,
                node,
                layerIndex,
                isSplitChart,
                overwriteColors,
                distinctSeries,
                { columnsLength: columns.length, rowsLength: rows.length },
                visParams,
                paletteService,
                byDataPalette,
                syncColors,
                isDarkMode,
                formatter,
                col,
                colorIndexMap
              ),
      },
    };
  });
};

/**
 * If colorMapping is available, returns a function that accept a string or an array of strings (used in case of multi-field-key)
 * and returns a color specified in the provided mapping
 */
function getColorFromMappingFactory(
  chartType: ChartTypes,
  columns: Array<Partial<BucketColumns>>,
  rows: DatatableRow[],
  palettes: KbnPalettes,
  visParams: PartitionVisParams,
  isDarkMode: boolean
): undefined | ColorHandlingFn {
  const { colorMapping, dimensions } = visParams;

  if (!colorMapping) {
    // return undefined, we will use the legacy color mapping instead
    return undefined;
  }
  // if pie/donut/treemap with no buckets use the default color mode
  if (
    (chartType === ChartTypes.DONUT ||
      chartType === ChartTypes.PIE ||
      chartType === ChartTypes.TREEMAP) &&
    (!dimensions.buckets || dimensions.buckets?.length === 0)
  ) {
    return undefined;
  }

  const categories = getColorCategoriesForChart(chartType, columns, rows);
  return getColorFactory(JSON.parse(colorMapping), palettes, isDarkMode, {
    type: 'categories',
    categories,
  });
}
