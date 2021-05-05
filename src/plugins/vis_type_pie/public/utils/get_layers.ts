/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  Datum,
  PartitionFillLabel,
  PartitionLayer,
  ShapeTreeNode,
  ArrayEntry,
} from '@elastic/charts';
import { SeriesLayer, PaletteRegistry, lightenColor } from '../../../charts/public';
import { DataPublicPluginStart } from '../../../data/public';
import { DatatableRow } from '../../../expressions/public';
import { BucketColumns, PieVisParams, SplitDimensionParams } from '../types';
import { getDistinctSeries } from './get_distinct_series';

const EMPTY_SLICE = Symbol('empty_slice');

export const computeColor = (
  d: ShapeTreeNode,
  isSplitChart: boolean,
  overwriteColors: { [key: string]: string },
  columns: Array<Partial<BucketColumns>>,
  rows: DatatableRow[],
  visParams: PieVisParams,
  palettes: PaletteRegistry | null,
  syncColors: boolean
) => {
  const { parentSeries, allSeries } = getDistinctSeries(rows, columns);

  if (visParams.distinctColors) {
    if (Object.keys(overwriteColors).includes(d.dataName.toString())) {
      return overwriteColors[d.dataName];
    }
    const index = allSeries.findIndex((name) => name === d.dataName);
    return palettes?.get(visParams.palette.name).getColor(
      [
        {
          name: d.dataName,
          rankAtDepth: index > -1 ? allSeries.findIndex((name) => name === d.dataName) : 0,
          totalSeriesAtDepth: allSeries.length || 1,
        },
      ],
      {
        maxDepth: 1,
        totalSeries: allSeries.length || 1,
        behindText: visParams.labels.show,
        syncColors,
      }
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
  seriesLayers.forEach((layer) => {
    if (Object.keys(overwriteColors).includes(layer.name)) {
      overwriteColor = overwriteColors[layer.name];
    }
  });

  if (overwriteColor) {
    return lightenColor(overwriteColor, seriesLayers.length, columns.length);
  }
  return palettes?.get(visParams.palette.name).getColor(seriesLayers, {
    behindText: visParams.labels.show,
    maxDepth: columns.length,
    totalSeries: rows.length,
    syncColors,
  });
};

export const getLayers = (
  columns: Array<Partial<BucketColumns>>,
  visParams: PieVisParams,
  overwriteColors: { [key: string]: string },
  rows: DatatableRow[],
  palettes: PaletteRegistry | null,
  formatter: DataPublicPluginStart['fieldFormats'],
  syncColors: boolean
): PartitionLayer[] => {
  const fillLabel: Partial<PartitionFillLabel> = {
    textInvertible: true,
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
        if (d === '') {
          return i18n.translate('visTypePie.emptyLabelValue', {
            defaultMessage: '(empty)',
          });
        }
        if (col.format) {
          return formatter.deserialize(col.format).convert(d) ?? '';
        }
        return String(d);
      },
      sortPredicate: ([name1, node1]: ArrayEntry, [name2, node2]: ArrayEntry) => {
        const params = col.meta?.sourceParams?.params as SplitDimensionParams | undefined;
        const sort: string | undefined = params?.orderBy;
        // metric sorting
        if (sort !== '_key') {
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
            syncColors
          );

          return outputColor || 'rgba(0,0,0,0)';
        },
      },
    };
  });
};
