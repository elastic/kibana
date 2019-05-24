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
// @ts-ignore
import { convert } from '../../../ui/public/vis/response_handlers/legacy';

export const kibanaTable = () => ({
  name: 'kibana_table',
  type: 'render',
  context: {
    types: ['kibana_datatable'],
  },
  help: i18n.translate('tableVis.function.help', {
    defaultMessage: 'Table visualization',
  }),
  args: {
    visConfig: {
      types: ['string', 'null'],
      default: '"{}"',
    },
    perPage: {
      types: ['number'],
      default: 10,
    },
    showPartialRows: {
      types: ['boolean'],
      default: false,
    },
    showMetricsAtAllLevels: {
      types: ['boolean'],
      default: false,
    },
    showTotal: {
      types: ['boolean'],
      default: false,
    },
    totalFunc: {
      types: ['string'],
      default: '"sum"',
    },
    sort: {
      types: ['string', 'null'],
      default: '"{}"',
      // columnIndex: null,
      // direction: null
    },
    buckets: {
      types: ['string', 'null'],
      default: '"{}"',
    },
    dimensions: {
      types: ['string', 'null'],
      default: '"{}"',
    },
    /*
    "dimensions":{
      "metrics":[
        {
          "accessor":0,
          "format":{
            "id":"number"
          },
          "params":{},
          "aggType":"count"
        }
      ],
      "buckets":[]
    }}'
    */
  },
  async fn(context: any, args: any) {
    const { perPage, showPartialRows, showMetricsAtAllLevels, showTotal, totalFunc } = args;
    const visConfig = {
      ...JSON.parse(args.visConfig),
      perPage,
      showPartialRows,
      showMetricsAtAllLevels,
      showTotal,
      totalFunc,
    };
    const convertedData = convert(context, visConfig.dimensions);

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visData: convertedData,
        visType: 'table',
        visConfig,
        params: {
          listenOnChange: true,
        },
      },
    };
  },
});
