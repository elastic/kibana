/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Datum, PartitionFillLabel, PartitionLayer, ShapeTreeNode } from '@elastic/charts';
import { SeriesLayer, PaletteRegistry, lightenColor } from '../../../charts/public';
import { DataPublicPluginStart } from '../../../data/public';
import { DatatableRow } from '../../../expressions/public';
import { BucketColumns, PieVisParams } from '../types';
import { getDistinctSeries } from './get_distinct_series';

const EMPTY_SLICE = Symbol('empty_slice');

const computeColor = (
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
    return palettes?.get(visParams.palette.name).getColor(
      [
        {
          name: d.dataName,
          rankAtDepth: allSeries.findIndex((name) => name === d.dataName),
          totalSeriesAtDepth: allSeries.length,
        },
      ],
      {
        maxDepth: 1,
        totalSeries: allSeries.length,
        behindText: false,
        syncColors,
      }
    );
  } else {
    const seriesLayers: SeriesLayer[] = [];
    let tempParent: typeof d | typeof d['parent'] = d;
    while (tempParent.parent && tempParent.depth > 0) {
      const seriesName = String(tempParent.parent.children[tempParent.sortIndex][0]);
      seriesLayers.unshift({
        name: seriesName,
        rankAtDepth:
          isSplitChart && parentSeries.includes(seriesName)
            ? parentSeries.findIndex((name) => name === seriesName)
            : tempParent.sortIndex,
        totalSeriesAtDepth: tempParent.parent.children.length,
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
  }
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
        if (col?.meta?.params) {
          return formatter.deserialize(col.format).convert(d) ?? '';
        }
        return String(d);
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
