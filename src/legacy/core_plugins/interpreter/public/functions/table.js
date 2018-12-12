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

import { LegacyResponseHandlerProvider } from 'ui/vis/response_handlers/legacy';
import { i18n } from '@kbn/i18n';

// eslint-disable-next-line new-cap
const responseHandler = LegacyResponseHandlerProvider().handler;

export const kibanaTable = () => ({
  name: 'kibana_table',
  type: 'render',
  context: {
    types: [
      'kibana_table'
    ],
  },
  help: i18n.translate('common.core_plugins.interpreter.public.functions.table.help', {
    defaultMessage: 'Table visualization'
  }),
  args: {
    bucket: {
      types: ['string'],
    },
    splitRow: {
      types: ['string'],
    },
    splitColumn: {
      types: ['string'],
    },
    metric: {
      types: ['string'],
      default: '1',
    },
    visConfig: {
      types: ['string', 'null'],
      default: '"{}"',
    },
  },
  async fn(context, args) {
    const visConfigParams = JSON.parse(args.visConfig);
    args.metric.split(',').forEach(metric => {
      const metricColumn = context.columns.find((column, i) =>
        column.id === metric || column.name === metric || i === parseInt(metric));
      metricColumn.aggConfig.schema = 'metric';
    });
    if (args.bucket) {
      args.bucket.split(',').forEach(bucket => {
        const bucketColumn = context.columns.find((column, i) =>
          column.id === bucket || column.name === bucket || i === parseInt(bucket));
        bucketColumn.aggConfig.schema = 'bucket';
      });
    }
    if (args.splitColumn) {
      args.splitColumn.split(',').forEach(split => {
        const splitColumn = context.columns.find((column, i) =>
          column.id === split || column.name === split || i === parseInt(split));
        splitColumn.aggConfig.schema = 'split';
      });
    }
    if (args.splitRow) {
      args.splitRow.split(',').forEach(split => {
        const splitColumn = context.columns.find((column, i) =>
          column.id === split || column.name === split || i === parseInt(split));
        splitColumn.aggConfig.schema = 'split';
        splitColumn.aggConfig.params.row = true;
      });
    }

    const convertedData = await responseHandler(context);

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visData: convertedData,
        visConfig: {
          type: 'table',
          params: visConfigParams,
        },
        params: {
          listenOnChange: true,
        }
      },
    };
  },
});
