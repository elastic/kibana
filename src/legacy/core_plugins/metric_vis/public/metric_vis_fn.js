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
    colorScheme: {
      types: ['string'],
      default: '"Green to Red"',
      options: Object.values(vislibColorMaps).map(value => value.id),
      help: i18n.translate('metricVis.function.colorScheme.help', {
        defaultMessage: 'Color scheme to use'
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
      types: ['range'],
      multi: true,
      help: i18n.translate('metricVis.function.colorRange.help', {
        defaultMessage: 'A range object specifying groups of values to which different colors should be applied.'
      })
    },
    useRanges: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('metricVis.function.useRanges.help', {
        defaultMessage: 'Enabled color ranges.'
      })
    },
    invertColors: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('metricVis.function.invertColors.help', {
        defaultMessage: 'Inverts the color ranges'
      })
    },
    showLabels: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('metricVis.function.showLabels.help', {
        defaultMessage: 'Shows labels under the metric values.'
      })
    },
    bgFill: {
      types: ['string'],
      default: '"#000"',
      aliases: ['backgroundFill', 'bgColor', 'backgroundColor'],
      help: i18n.translate('metricVis.function.bgFill.help', {
        defaultMessage: 'Color as html hex code (#123456), html color (red, blue) or rgba value (rgba(255,255,255,1)).'
      })
    },
    font: {
      types: ['style'],
      help: i18n.translate('metricVis.function.font.help', {
        defaultMessage: 'Font settings.'
      }),
      default: '{font size=60}',
    },
    subText: {
      types: ['string'],
      aliases: ['label', 'text', 'description'],
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

    if (args.percentage && (!args.colorRange || args.colorRange.length === 0)) {
      throw new Error ('colorRange must be provided when using percentage');
    }

    const fontSize = parseInt(args.font.spec.fontSize);

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
            colorSchema: args.colorScheme,
            metricColorMode: args.colorMode,
            colorsRange: args.colorRange,
            labels: {
              show: args.showLabels,
            },
            invertColors: args.invertColors,
            style: {
              bgFill: args.bgFill,
              bgColor: args.colorMode === 'Background',
              labelColor: args.colorMode === 'Labels',
              subText: args.subText,
              fontSize,
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
