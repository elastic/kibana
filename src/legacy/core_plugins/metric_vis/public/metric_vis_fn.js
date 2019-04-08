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

import { functionsRegistry } from 'plugins/interpreter/registries';
import { i18n } from '@kbn/i18n';
import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';

export const metric = () => ({
  name: 'metricVis',
  type: 'render',
  context: {
    types: [
      'kibana_datatable'
    ],
  },
  help: i18n.translate('metricVis.function.help', {
    defaultMessage: 'Metric visualization'
  }),
  args: {
    percentage: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('metricVis.function.percentage.help', {
        defaultMessage: 'Shows metric in percentage mode. Requires colorRange to be set.'
      })
    },
    colorSchema: {
      types: ['string'],
      default: '"Green to Red"',
      options: Object.values(vislibColorMaps).map(value => value.id),
      help: i18n.translate('metricVis.function.colorSchema.help', {
        defaultMessage: 'Color schema to use'
      })
    },
    colorMode: {
      types: ['string'],
      default: '"None"',
      options: ['None', 'Label', 'Background'],
      help: i18n.translate('metricVis.function.colorMode.help', {
        defaultMessage: 'Which part of metric to color'
      })
    },
    colorRange: {
      types: ['string'],
      default: '"[{ from: 0, to: 10000 }]"',
      help: i18n.translate('metricVis.function.colorRange.help', {
        defaultMessage: 'Color ranges: array of objects with from and to property.'
      })
    },
    useRanges: {
      types: ['boolean'],
      default: false,
    },
    invertColors: {
      types: ['boolean'],
      default: false,
    },
    showLabels: {
      types: ['boolean'],
      default: true,
    },
    bgFill: {
      types: ['string'],
      default: '"#000"',
      help: i18n.translate('metricVis.function.subText.help', {
        defaultMessage: 'Color as html hex code (#123456), html color (red, blue) or rgba value (rgba(255,255,255,1)).'
      })
    },
    fontSize: {
      types: ['number'],
      default: 60,
    },
    subText: {
      types: ['string'],
      default: '""',
      help: i18n.translate('metricVis.function.subText.help', {
        defaultMessage: 'Custom text to show under the metric'
      })
    },
    metric: {
      types: ['vis_dimension'],
      help: i18n.translate('metricVis.function.metric.help', {
        defaultMessage: 'metric dimension configuration'
      }),
      required: true,
      multi: true,
    },
    bucket: {
      types: ['vis_dimension'],
      help: i18n.translate('metricVis.function.bucket.help', {
        defaultMessage: 'bucket dimension configuration'
      }),
    },
  },
  fn(context, args) {

    const dimensions = {
      metrics: args.metric,
    };

    if (args.bucket) {
      dimensions.bucket = args.bucket;
    }

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visData: context,
        visType: 'metric',
        visConfig: {
          metric: {
            percentageMode: args.percentage,
            useRanges: args.useRanges,
            colorSchema: args.colorSchema,
            metricColorMode: args.colorMode,
            colorsRange: JSON.parse(args.colorRange),
            labels: {
              show: args.showLabels,
            },
            invertColors: args.invertColors,
            style: {
              bgFill: args.bgFill,
              bgColor: args.colorMode === 'Background',
              labelColor: args.colorMode === 'Label',
              subText: args.subText,
              fontSize: args.fontSize,
            }
          },
          dimensions,
        },
        params: {
          listenOnChange: true,
        }
      },
    };
  },
});

functionsRegistry.register(metric);
