/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
  palettes: PaletteRegistry,
  formatter: DataPublicPluginStart['fieldFormats']
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

          const outputColor = palettes.get(visParams.palette.name).getColor(seriesLayers, {
            behindText: visParams.labels.show,
            maxDepth: columns.length,
            totalSeries,
          });

          return outputColor || 'rgba(0,0,0,0)';
        },
      },
    };
  });
};
