/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datum, PartitionLayer, ShapeTreeNode, ArrayEntry } from '@elastic/charts';
import { isEqual } from 'lodash';
import type { FieldFormatsStart } from 'src/plugins/field_formats/public';
import { SeriesLayer, PaletteRegistry, lightenColor } from '../../../../charts/public';
import type { DatatableRow } from '../../../../expressions/public';
import type { BucketColumns, PieVisParams, SplitDimensionParams } from '../../common/types';
import { getDistinctSeries } from './get_distinct_series';

const EMPTY_SLICE = Symbol('empty_slice');

export const computeColor = (
  d: ShapeTreeNode,
  isSplitChart: boolean,
  overwriteColors: { [key: string]: string } = {},
  columns: Array<Partial<BucketColumns>>,
  rows: DatatableRow[],
  visParams: PieVisParams,
  palettes: PaletteRegistry | null,
  syncColors: boolean,
  formatter: FieldFormatsStart,
  format?: BucketColumns['format']
) => {
  const { parentSeries, allSeries } = getDistinctSeries(rows, columns);
  const dataName = d.dataName;

  let formattedLabel = '';
  if (format) {
    formattedLabel = formatter.deserialize(format).convert(dataName) ?? '';
  }

  if (visParams.distinctColors) {
    let overwriteColor;
    // this is for supporting old visualizations (created by vislib plugin)
    // it seems that there for some aggs, the uiState saved from vislib is
    // different than the es-charts handle it
    if (overwriteColors.hasOwnProperty(formattedLabel)) {
      overwriteColor = overwriteColors[formattedLabel];
    }

    if (Object.keys(overwriteColors).includes(dataName.toString())) {
      overwriteColor = overwriteColors[dataName];
    }

    if (overwriteColor) {
      return overwriteColor;
    }

    const index = allSeries.findIndex((name) => isEqual(name, dataName));
    const isSplitParentLayer = isSplitChart && parentSeries.includes(dataName);
    return palettes?.get(visParams.palette.name).getCategoricalColor(
      [
        {
          name: dataName,
          rankAtDepth: isSplitParentLayer
            ? parentSeries.findIndex((name) => name === dataName)
            : index > -1
            ? index
            : 0,
          totalSeriesAtDepth: isSplitParentLayer ? parentSeries.length : allSeries.length || 1,
        },
      ],
      {
        maxDepth: 1,
        totalSeries: allSeries.length || 1,
        behindText: visParams.labels.show,
        syncColors,
      },
      visParams.palette?.params ?? { colors: [] }
    );
  }
  const seriesLayers: SeriesLayer[] = [];
  let tempParent: typeof d | typeof d['parent'] = d;
  while (tempParent.parent && tempParent.depth > 0) {
    const seriesName = String(tempParent.parent.children[tempParent.sortIndex][0]);
    const isSplitParentLayer = isSplitChart && parentSeries.includes(seriesName);
    seriesLayers.unshift({
      name: seriesName,
      rankAtDepth: isSplitParentLayer
        ? parentSeries.findIndex((name) => name === seriesName)
        : tempParent.sortIndex,
      totalSeriesAtDepth: isSplitParentLayer
        ? parentSeries.length
        : tempParent.parent.children.length,
    });
    tempParent = tempParent.parent;
  }

  let overwriteColor;
  // this is for supporting old visualizations (created by vislib plugin)
  // it seems that there for some aggs, the uiState saved from vislib is
  // different than the es-charts handle it
  if (overwriteColors.hasOwnProperty(formattedLabel)) {
    overwriteColor = overwriteColors[formattedLabel];
  }

  seriesLayers.forEach((layer) => {
    if (Object.keys(overwriteColors).includes(layer.name)) {
      overwriteColor = overwriteColors[layer.name];
    }
  });

  if (overwriteColor) {
    return lightenColor(overwriteColor, seriesLayers.length, columns.length);
  }
  return palettes?.get(visParams.palette.name).getCategoricalColor(
    seriesLayers,
    {
      behindText: visParams.labels.show,
      maxDepth: columns.length,
      totalSeries: rows.length,
      syncColors,
    },
    visParams.palette?.params ?? { colors: [] }
  );
};

export const getLayers = (
  columns: Array<Partial<BucketColumns>>,
  visParams: PieVisParams,
  overwriteColors: { [key: string]: string } = {},
  rows: DatatableRow[],
  palettes: PaletteRegistry | null,
  formatter: FieldFormatsStart,
  syncColors: boolean
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
  return columns.map((col) => {
    return {
      groupByRollup: (d: Datum) => {
        return col.id ? d[col.id] : col.name;
      },
      showAccessor: (d: Datum) => d !== EMPTY_SLICE,
      nodeLabel: (d: unknown) => {
        if (col.format) {
          return formatter.deserialize(col.format).convert(d) ?? '';
        }
        return String(d);
      },
      sortPredicate: ([name1, node1]: ArrayEntry, [name2, node2]: ArrayEntry) => {
        const params = col.meta?.sourceParams?.params as SplitDimensionParams | undefined;
        const sort: string | undefined = params?.orderBy;
        // unconditionally put "Other" to the end (as the "Other" slice may be larger than a regular slice, yet should be at the end)
        if (name1 === '__other__' && name2 !== '__other__') return 1;
        if (name2 === '__other__' && name1 !== '__other__') return -1;
        // metric sorting
        if (sort && sort !== '_key') {
          if (params?.order === 'desc') {
            return node2.value - node1.value;
          } else {
            return node1.value - node2.value;
          }
          // alphabetical sorting
        } else {
          if (name1 > name2) {
            return params?.order === 'desc' ? -1 : 1;
          }
          if (name2 > name1) {
            return params?.order === 'desc' ? 1 : -1;
          }
        }
        return 0;
      },
      fillLabel,
      shape: {
        fillColor: (d) => {
          const outputColor = computeColor(
            d,
            isSplitChart,
            overwriteColors,
            columns,
            rows,
            visParams,
            palettes,
            syncColors,
            formatter,
            col.format
          );

          return outputColor || 'rgba(0,0,0,0)';
        },
      },
    };
  });
};
