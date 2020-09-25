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
import hjson from 'hjson';
import { get } from 'lodash';
import { first } from 'rxjs/operators';
import { SearchResponse } from 'elasticsearch';

import { LegacyAPICaller } from 'src/core/server';
import { ConfigObservable } from '../types';

export type ESResponse = SearchResponse<{ visualization: { visState: string } }>;

const VEGA_USAGE_TYPE = 'vis_type_vega';

const checkVegaSchemaType = (schemaURL: string, type: 'vega' | 'vega-lite') =>
  schemaURL.includes(`//vega.github.io/schema/${type}/`);

const getStats = async (callCluster: LegacyAPICaller, index: string) => {
  const searchParams = {
    size: 10000,
    index,
    ignoreUnavailable: true,
    filterPath: ['hits.hits._id', 'hits.hits._source.visualization'],
    body: {
      query: {
        bool: { filter: { term: { type: 'visualization' } } },
      },
    },
  };
  const esResponse: ESResponse = await callCluster('search', searchParams);
  const size = get(esResponse, 'hits.hits.length', 0);

  if (!size) {
    return;
  }

  return esResponse.hits.hits.reduce(
    (telemetry, hit) => {
      const visualization = get(hit, '_source.visualization', { visState: '{}' });
      const visState: { type?: string; params?: { spec?: string } } = JSON.parse(
        visualization.visState
      );

      if (visState.type === 'vega' && visState.params?.spec)
        try {
          const spec = hjson.parse(visState.params.spec, { legacyRoot: false });

          if (spec) {
            if (checkVegaSchemaType(spec.$schema, 'vega')) {
              telemetry.vega_lib_specs_total++;
            }
            if (checkVegaSchemaType(spec.$schema, 'vega-lite')) {
              telemetry.vega_lite_lib_specs_total++;
            }
            if (spec.config?.kibana?.type === 'map') {
              telemetry.vega_map_layout_total++;
            }
          }
        } catch (e) {
          // Let it go, the data is invalid and we'll don't need to handle it
        }

      return telemetry;
    },
    {
      vega_lib_specs_total: 0,
      vega_lite_lib_specs_total: 0,
      vega_map_layout_total: 0,
    }
  );
};

export function getUsageCollector(config: ConfigObservable) {
  return {
    type: VEGA_USAGE_TYPE,
    isReady: () => true,
    fetch: async (callCluster: LegacyAPICaller) => {
      const { index } = (await config.pipe(first()).toPromise()).kibana;

      return await getStats(callCluster, index);
    },
  };
}
