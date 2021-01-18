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
import { ElasticsearchClient } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { SavedVisState } from 'src/plugins/visualizations/common';
import { TableVisParams, VIS_TYPE_TABLE } from '../../common';

type ESResponse = SearchResponse<{ visualization: { visState: string } }>;

export interface VisTypeTableUsage {
  /**
   * Total number of table type visualizations
   */
  total: number;
  /**
   * Total number of table visualizations, using "Split table" agg
   */
  total_split: number;
  /**
   * Split table by columns stats
   */
  split_columns: {
    total: number;
    enabled: number;
  };
  /**
   * Split table by rows stats
   */
  split_rows: {
    total: number;
    enabled: number;
  };
}

/*
 * Parse the response data into telemetry payload
 */
export async function getStats(
  esClient: ElasticsearchClient,
  index: string
): Promise<VisTypeTableUsage | undefined> {
  const searchParams = {
    size: 10000, // elasticsearch index.max_result_window default value
    index,
    ignoreUnavailable: true,
    filterPath: ['hits.hits._source.visualization'],
    body: {
      query: {
        bool: { filter: { term: { type: 'visualization' } } },
      },
    },
  };
  const { body: esResponse } = await esClient.search<ESResponse>(searchParams);
  const size = get(esResponse, 'hits.hits.length', 0);
  if (size < 1) {
    return;
  }

  const tableVisualizations = esResponse.hits.hits
    .map((hit) => {
      const visualization = get(hit, '_source.visualization', { visState: '{}' });
      const visState: SavedVisState<TableVisParams> = JSON.parse(visualization.visState);
      return {
        type: visState.type || '_na_',
        visState,
      };
    })
    .filter((vis) => vis.type === VIS_TYPE_TABLE);

  const defaultStats = {
    total: tableVisualizations.length,
    total_split: 0,
    split_columns: {
      total: 0,
      enabled: 0,
    },
    split_rows: {
      total: 0,
      enabled: 0,
    },
  };

  return tableVisualizations.reduce((acc, { visState }) => {
    const hasSplitAgg = visState.aggs.find((agg) => agg.schema === 'split');

    if (hasSplitAgg) {
      acc.total_split += 1;

      const isSplitRow = visState.params.row;
      const isSplitEnabled = hasSplitAgg.enabled;

      const container = isSplitRow ? acc.split_rows : acc.split_columns;
      container.total += 1;
      container.enabled = isSplitEnabled ? container.enabled + 1 : container.enabled;
    }

    return acc;
  }, defaultStats);
}
