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

import { elasticsearchServiceMock, loggingSystemMock } from '../../../core/server/mocks';
import { createClusterDataCheck } from './check_cluster_data';

describe('checkClusterForUserData', () => {
  it('returns false if no data is found', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.cat.indices.mockResolvedValue(
      elasticsearchServiceMock.createApiResponse({ body: [] })
    );

    const log = loggingSystemMock.createLogger();

    const response = await createClusterDataCheck()(esClient, log);
    expect(response).toEqual(false);
    expect(esClient.cat.indices).toHaveBeenCalledTimes(1);
  });

  it('returns false if data only exists in system indices', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.cat.indices.mockResolvedValue(
      elasticsearchServiceMock.createApiResponse({
        body: [
          {
            index: '.kibana',
            'docs.count': 500,
          },
          {
            index: 'kibana_sample_ecommerce_data',
            'docs.count': 20,
          },
          {
            index: '.somethingElse',
            'docs.count': 20,
          },
        ],
      })
    );

    const log = loggingSystemMock.createLogger();

    const response = await createClusterDataCheck()(esClient, log);
    expect(response).toEqual(false);
    expect(esClient.cat.indices).toHaveBeenCalledTimes(1);
  });

  it('returns true if data exists in non-system indices', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.cat.indices.mockResolvedValue(
      elasticsearchServiceMock.createApiResponse({
        body: [
          {
            index: '.kibana',
            'docs.count': 500,
          },
          {
            index: 'some_real_index',
            'docs.count': 20,
          },
        ],
      })
    );

    const log = loggingSystemMock.createLogger();

    const response = await createClusterDataCheck()(esClient, log);
    expect(response).toEqual(true);
  });

  it('checks each time until the first true response is returned, then stops checking', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.cat.indices
      .mockResolvedValueOnce(
        elasticsearchServiceMock.createApiResponse({
          body: [],
        })
      )
      .mockRejectedValueOnce(new Error('something terrible happened'))
      .mockResolvedValueOnce(
        elasticsearchServiceMock.createApiResponse({
          body: [
            {
              index: '.kibana',
              'docs.count': 500,
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        elasticsearchServiceMock.createApiResponse({
          body: [
            {
              index: 'some_real_index',
              'docs.count': 20,
            },
          ],
        })
      );

    const log = loggingSystemMock.createLogger();

    const doesClusterHaveUserData = createClusterDataCheck();

    let response = await doesClusterHaveUserData(esClient, log);
    expect(response).toEqual(false);

    response = await doesClusterHaveUserData(esClient, log);
    expect(response).toEqual(false);

    response = await doesClusterHaveUserData(esClient, log);
    expect(response).toEqual(false);

    response = await doesClusterHaveUserData(esClient, log);
    expect(response).toEqual(true);

    expect(esClient.cat.indices).toHaveBeenCalledTimes(4);
    expect(log.warn.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "Error encountered while checking cluster for user data: Error: something terrible happened",
        ],
      ]
    `);

    response = await doesClusterHaveUserData(esClient, log);
    expect(response).toEqual(true);
    // Same number of calls as above. We should not have to interrogate again.
    expect(esClient.cat.indices).toHaveBeenCalledTimes(4);
  });
});
