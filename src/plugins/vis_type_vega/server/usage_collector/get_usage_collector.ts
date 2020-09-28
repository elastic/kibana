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
import { get } from 'lodash';
import { parse } from 'hjson';
import { first } from 'rxjs/operators';
import { SearchResponse } from 'elasticsearch';

import { LegacyAPICaller } from 'src/core/server';
import { ConfigObservable } from '../types';

type ESResponse = SearchResponse<{ visualization: { visState: string } }>;
type VegaType = 'vega' | 'vega-lite';

const VEGA_USAGE_TYPE = 'vis_type_vega';

const checkVegaSchemaType = (schemaURL: string, type: VegaType) =>
  schemaURL.includes(`//vega.github.io/schema/${type}/`);

// we want to exclude the Vega Sample Data visualizations from the stats
// in order to have more accurate results
const excludedFromStatsVisualizations = [
  '[Flights] Airport Connections (Hover Over Airport)',
  '[Flights] Departure Count Map',
  '[Logs] File Type Scatter Plot',
  '[Logs] Source and Destination Sankey Chart',
  '[Logs] Visitors Map',
  '[eCommerce] Sales Count Map',
];

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

  let shouldPublishTelemetry = false;

  if (!size) {
    return;
  }

  const finalTelemetry = esResponse.hits.hits.reduce(
    (telemetry, hit) => {
      const visualization = get(hit, '_source.visualization', { visState: '{}' });
      const visState: { title: string; type?: string; params?: { spec?: string } } = JSON.parse(
        visualization.visState
      );

      if (
        visState.type === 'vega' &&
        visState.params?.spec &&
        !excludedFromStatsVisualizations.includes(visState.title)
      )
        try {
          const spec = parse(visState.params.spec, { legacyRoot: false });

          if (spec) {
            shouldPublishTelemetry = true;
            if (checkVegaSchemaType(spec.$schema, 'vega')) {
              telemetry.vega_lib_specs_total++;
            }
            if (checkVegaSchemaType(spec.$schema, 'vega-lite')) {
              telemetry.vega_lite_lib_specs_total++;
            }
            if (spec.config?.kibana?.type === 'map') {
              telemetry.vega_use_map_total++;
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
      vega_use_map_total: 0,
    }
  );

  return shouldPublishTelemetry ? finalTelemetry : undefined;
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
