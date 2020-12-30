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

import { getNodesUsage } from './get_nodes_usage';
import { TIMEOUT } from './constants';
import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';

const mockedNodesFetchResponse = {
  cluster_name: 'test cluster',
  nodes: {
    some_node_id: {
      timestamp: 1588617023177,
      since: 1588616945163,
      rest_actions: {
        nodes_usage_action: 1,
        create_index_action: 1,
        document_get_action: 1,
        search_action: 19,
        nodes_info_action: 36,
      },
      aggregations: {
        terms: {
          bytes: 2,
        },
        scripted_metric: {
          other: 7,
        },
      },
    },
  },
};

describe('get_nodes_usage', () => {
  it('returns a modified array of nodes usage data', async () => {
    const response = Promise.resolve({ body: mockedNodesFetchResponse });
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    esClient.nodes.usage.mockImplementationOnce(
      // @ts-ignore
      async (_params = { timeout: TIMEOUT }) => {
        return response;
      }
    );
    const item = await getNodesUsage(esClient);
    expect(esClient.nodes.usage).toHaveBeenCalledWith({ timeout: TIMEOUT });
    expect(item).toStrictEqual({
      nodes: [
        {
          aggregations: { scripted_metric: { other: 7 }, terms: { bytes: 2 } },
          node_id: 'some_node_id',
          rest_actions: {
            create_index_action: 1,
            document_get_action: 1,
            nodes_info_action: 36,
            nodes_usage_action: 1,
            search_action: 19,
          },
          since: 1588616945163,
          timestamp: 1588617023177,
        },
      ],
    });
  });
});
