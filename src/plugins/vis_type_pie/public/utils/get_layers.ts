/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Datum, PartitionFillLabel, PartitionLayer } from '@elastic/charts';
import { SeriesLayer, PaletteRegistry, lightenColor } from '../../../charts/public';
import { DataPublicPluginStart } from '../../../data/public';
import { BucketColumns, PieVisParams } from '../types';

const EMPTY_SLICE = Symbol('empty_slice');

export const getLayers = (
  columns: Array<Partial<BucketColumns>>,
  visParams: PieVisParams,
  overwriteColors: { [key: string]: string },
  totalSeries: number,
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
          const seriesLayers: SeriesLayer[] = [];

          // Color is determined by round-robin on the index of the innermost slice
          // This has to be done recursively until we get to the slice index
          let tempParent: typeof d | typeof d['parent'] = d;
          while (tempParent.parent && tempParent.depth > 0) {
            seriesLayers.unshift({
              name: String(tempParent.parent.children[tempParent.sortIndex][0]),
              rankAtDepth: tempParent.sortIndex,
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

          const outputColor = palettes?.get(visParams.palette.name).getColor(seriesLayers, {
            behindText: visParams.labels.show,
            maxDepth: columns.length,
            totalSeries,
            syncColors,
          });

          return outputColor || 'rgba(0,0,0,0)';
        },
      },
    };
  });
};
