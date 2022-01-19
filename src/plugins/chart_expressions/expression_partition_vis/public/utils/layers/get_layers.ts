/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datum, PartitionFillLabel, PartitionLayer } from '@elastic/charts';
import type { FieldFormatsStart } from '../../../../../field_formats/public';
import { PaletteRegistry } from '../../../../../charts/public';
import type { Datatable, DatatableRow } from '../../../../../expressions/public';
import { BucketColumns, ChartTypes, PartitionVisParams } from '../../../common/types';
import { sortPredicateByType } from './sort_predicate';
import { byDataColorPaletteMap, getColor } from './get_color';
import { getNodeLabel } from './get_node_labels';
import { generateFormatters } from './get_formatters';

const EMPTY_SLICE = Symbol('empty_slice');

export const getLayers = (
  chartType: ChartTypes,
  columns: Array<Partial<BucketColumns>>,
  visParams: PartitionVisParams,
  visData: Datatable,
  overwriteColors: { [key: string]: string } = {},
  rows: DatatableRow[],
  palettes: PaletteRegistry | null,
  formatter: FieldFormatsStart,
  syncColors: boolean,
  isDarkMode: boolean
): PartitionLayer[] => {
  const fillLabel: Partial<PartitionFillLabel> = {
    valueFont: {
      fontWeight: 700,
    },
  };

  if (!visParams.labels.values) {
    fillLabel.valueFormatter = () => '';
  }

  const formatters = generateFormatters(visParams, visData, formatter.deserialize);

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
  return columns.map((col, layerIndex) => {
    return {
      groupByRollup: (d: Datum) => (col.id ? d[col.id] ?? EMPTY_SLICE : col.name),
      showAccessor: (d: Datum) => d !== EMPTY_SLICE,
      nodeLabel: (d: unknown) => getNodeLabel(d, col, formatters, formatter.deserialize),
      fillLabel,
      sortPredicate: sortPredicateByType(chartType, visParams, visData, columns, col),
      shape: {
        fillColor: (d) =>
          getColor(
            chartType,
            d,
            layerIndex,
            isSplitChart,
            overwriteColors,
            columns,
            rows,
            visParams,
            palettes,
            byDataPalette,
            syncColors,
            isDarkMode,
            formatter,
            col.format
          ),
      },
    };
  });
};
