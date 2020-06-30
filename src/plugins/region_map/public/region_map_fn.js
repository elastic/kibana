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

export const createRegionMapFn = () => ({
  name: 'regionmap',
  type: 'render',
  context: {
    types: ['kibana_datatable'],
  },
  help: i18n.translate('regionMap.function.help', {
    defaultMessage: 'Regionmap visualization',
  }),
  args: {
    visConfig: {
      types: ['string', 'null'],
      default: '"{}"',
    },
  },
  fn(context, args) {
    const visConfig = JSON.parse(args.visConfig);

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visData: context,
        visType: 'region_map',
        visConfig,
        params: {
          listenOnChange: true,
        },
      },
    };
  },
});
