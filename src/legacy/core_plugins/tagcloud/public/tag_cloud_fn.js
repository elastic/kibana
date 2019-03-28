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

export const tagcloud = () => ({
  name: 'tagcloud',
  type: 'render',
  context: {
    types: [
      'kibana_datatable'
    ],
  },
  help: i18n.translate('tagCloud.function.help', {
    defaultMessage: 'Tagcloud visualization'
  }),
  args: {
    scale: {
      types: ['string'],
      default: 'linear',
      options: ['linear', 'log', 'square root'],
      help: i18n.translate('tagcloud.function.scale.help', {
        defaultMessage: 'Scale to determine font size of a word'
      }),
    },
    orientation: {
      types: ['string'],
      default: 'single',
      options: ['single', 'right angled', 'multiple'],
      help: i18n.translate('tagcloud.function.orientation.help', {
        defaultMessage: 'Orientation of words inside tagcloud'
      }),
    },
    minFontSize: {
      types: ['number'],
      default: 18,
    },
    maxFontSize: {
      types: ['number'],
      default: 72
    },
    showLabel: {
      types: ['boolean'],
      default: true,
    },
    metric: {
      types: ['string', 'number'],
      help: i18n.translate('tagcloud.function.metric.help', {
        defaultMessage: 'Column in your dataset to use as a metric (either column index or column name)'
      }),
    },
    bucket: {
      types: ['string', 'number'],
      help: i18n.translate('tagcloud.function.bucket.help', {
        defaultMessage: 'Column in your dataset to use as a bucket (either column index or column name)'
      }),
    },
    bucketFormat: {
      types: ['string'],
      default: 'string'
    },
    bucketFormatParams: {
      types: ['string'],
      default: '"{}"',
    }
  },
  fn(context, args) {
    const metricAccessor = Number.isInteger(args.metric) ?
      args.metric :
      context.columns.find(c => c.id === args.metric);
    if (metricAccessor === undefined) {
      throw new Error(i18n.translate('tagcloud.function.error.metric', {
        defaultMessage: 'Column name provided for metric is invalid'
      }));
    }

    const visConfig = {
      scale: args.scale,
      orientation: args.orientation,
      minFontSize: args.minFontSize,
      maxFontSize: args.maxFontSize,
      showLabel: args.showLabel,
      metric: {
        accessor: metricAccessor,
        format: {},
      },
    };

    if (args.bucket !== undefined) {
      const bucketAccessor = Number.isInteger(args.bucket) ?
        args.bucket :
        context.columns.find(c => c.id === args.bucket);
      if (bucketAccessor === undefined) {
        throw new Error(i18n.translate('tagcloud.function.error.metric', {
          defaultMessage: 'Column name provided for bucket is invalid'
        }));
      }

      visConfig.bucket = {
        accessor: args.bucket,
        format: {
          id: args.bucketFormat,
          params: JSON.parse(args.bucketFormatParams),
        },
      };
    }

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visData: context,
        visType: 'tagcloud',
        visConfig,
        params: {
          listenOnChange: true,
        }
      },
    };
  },
});

functionsRegistry.register(tagcloud);
