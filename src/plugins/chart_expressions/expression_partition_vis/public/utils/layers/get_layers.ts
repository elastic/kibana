/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datum, PartitionLayer } from '@elastic/charts';
import {
  ColorMapping,
  PaletteRegistry,
  getColorFactory,
  SPECIAL_RULE_MATCHES,
  getPalette,
  availablePalettes,
  NeutralPalette,
} from '@kbn/coloring';
import { i18n } from '@kbn/i18n';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { Datatable, DatatableRow } from '@kbn/expressions-plugin/public';

import { getDistinctSeries } from '..';
import { BucketColumns, ChartTypes, PartitionVisParams } from '../../../common/types';
import { sortPredicateByType, sortPredicateSaveSourceOrder } from './sort_predicate';
import { byDataColorPaletteMap, getColor } from './get_color';
import { getNodeLabel } from './get_node_labels';
import { getPartitionFillColor } from './get_color_from_mappings';

// TODO: export to a reusable function
export const MULTI_FIELD_VALUES_SEPARATOR = ' › ';
export function getColorCategories(rows: DatatableRow[], accessor?: string) {
  return accessor
    ? rows.reduce<{ keys: Set<string>; array: Array<string | string[]> }>(
        (acc, r) => {
          const value = r[accessor];
          if (value === undefined) {
            return acc;
          }
          const key = value.hasOwnProperty('keys') ? [...value.keys] : [value];
          const stringifiedKeys = key.join(',');
          if (!acc.keys.has(stringifiedKeys)) {
            acc.keys.add(stringifiedKeys);
            acc.array.push(key.length === 1 ? key[0] : key);
          }
          return acc;
        },
        { keys: new Set(), array: [] }
      ).array
    : [];
}

// This is particularly useful in case of a text based languages where
// it's no possible to use a missingBucketLabel
const emptySliceLabel = i18n.translate('expressionPartitionVis.emptySlice', {
  defaultMessage: '(empty)',
});

export const getLayers = (
  chartType: ChartTypes,
  columns: Array<Partial<BucketColumns>>,
  visParams: PartitionVisParams,
  visData: Datatable,
  overwriteColors: { [key: string]: string } = {},
  rows: DatatableRow[],
  palettes: PaletteRegistry | null,
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

  const isSplitChart = Boolean(visParams.dimensions.splitColumn || visParams.dimensions.splitRow);
  let byDataPalette: ReturnType<typeof byDataColorPaletteMap>;
  if (!syncColors && columns[1]?.id && palettes && visParams.palette) {
    byDataPalette = byDataColorPaletteMap(
      rows,
      columns[1].id,
      palettes?.get(visParams.palette.name),
      visParams.palette
    );
  }

  const sortPredicateForType = sortPredicateByType(chartType, visParams, visData, columns);

  const distinctSeries = getDistinctSeries(rows, columns);

  // the mosaic configures the main categories in the second column, instead of the first
  // as it happens in all the other partition types
  const splitCategories =
    chartType === ChartTypes.MOSAIC && columns.length === 2
      ? getColorCategories(rows, columns[1]?.id as string)
      : getColorCategories(rows, columns[0]?.id as string);

  const colorMappingModel: ColorMapping.Config = JSON.parse(visParams.colorMapping);

  const getColorFromMappings = getColorFactory(
    colorMappingModel,
    getPalette(availablePalettes, NeutralPalette),
    isDarkMode,
    { type: 'categories', categories: splitCategories, specialHandling: SPECIAL_RULE_MATCHES }
  );

  const canUseColorMappings = true;

  return columns.map((col, layerIndex) => {
    return {
      groupByRollup: (d: Datum) => (col.id ? d[col.id] ?? emptySliceLabel : col.name),
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
        fillColor: canUseColorMappings
          ? getPartitionFillColor(chartType, layerIndex, columns.length, getColorFromMappings)
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
                palettes,
                byDataPalette,
                syncColors,
                isDarkMode,
                formatter,
                col,
                formatters
              ),
      },
    };
  });
};
