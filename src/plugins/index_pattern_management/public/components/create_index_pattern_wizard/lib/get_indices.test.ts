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

import { getIndices } from './get_indices';
import { IndexPatternCreationConfig } from '../../../../../index_pattern_management/public';
// import { LegacyApiCaller } from '../../../../../data/public/search/legacy';
import { httpServiceMock } from '../../../../../../core/public/mocks';

export const successfulResponse = {
  indices: [
    {
      name: 'remoteCluster1:bar-01',
      attributes: ['open'],
    },
    /*
    {
      name: 'foo-000001',
      attributes: ['open', 'hidden'],
      data_stream: 'foo',
    },

    {
      name: 'foo_closed',
      attributes: ['closed'],
    },

    {
      name: 'freeze-index',
      aliases: ['f-alias'],
      attributes: ['open', 'frozen'],
    },
    */
  ],
  aliases: [
    {
      name: 'f-alias',
      indices: ['freeze-index', 'my-index'],
    },
  ],
  data_streams: [
    {
      name: 'foo',
      backing_indices: ['foo-000001'],
      timestamp_field: '@timestamp',
    },
  ],
};

/*
export const exceptionResponse = {
  body: {
    error: {
      root_cause: [
        {
          type: 'index_not_found_exception',
          reason: 'no such index',
          index_uuid: '_na_',
          'resource.type': 'index_or_alias',
          'resource.id': 't',
          index: 't',
        },
      ],
      type: 'transport_exception',
      reason: 'unable to communicate with remote cluster [cluster_one]',
      caused_by: {
        type: 'index_not_found_exception',
        reason: 'no such index',
        index_uuid: '_na_',
        'resource.type': 'index_or_alias',
        'resource.id': 't',
        index: 't',
      },
    },
  },
  status: 500,
};

export const errorResponse = {
  statusCode: 400,
  error: 'Bad Request',
};
*/
const mockIndexPatternCreationType = new IndexPatternCreationConfig({
  type: 'default',
  name: 'name',
  showSystemIndices: false,
  httpClient: {},
  isBeta: false,
});

/*
function esClientFactory(search: (params: any) => any): LegacyApiCaller {
  return {
    search,
    msearch: () => ({
      abort: () => {},
      ...new Promise((resolve) => resolve({})),
    }),
  };
}
*/

// const es = esClientFactory(() => successfulResponse);

const http = httpServiceMock.createStartContract();
http.get.mockResolvedValue(successfulResponse);

describe('getIndices', () => {
  it('should work in a basic case', async () => {
    const result = await getIndices(http, mockIndexPatternCreationType, 'kibana', false);
    expect(result.length).toBe(3);
    expect(result[0].name).toBe('f-alias');
    expect(result[1].name).toBe('foo');
  });

  it('should ignore ccs query-all', async () => {
    expect((await getIndices(http, mockIndexPatternCreationType, '*:', false)).length).toBe(0);
  });

  it('should ignore a single comma', async () => {
    expect((await getIndices(http, mockIndexPatternCreationType, ',', false)).length).toBe(0);
    expect((await getIndices(http, mockIndexPatternCreationType, ',*', false)).length).toBe(0);
    expect((await getIndices(http, mockIndexPatternCreationType, ',foobar', false)).length).toBe(0);
  });

  it('should trim the input', async () => {
    let index;
    // http.get.mockImplementation
    http.get.mockResolvedValue((params: { index: string }) => {
      index = params.index;
    });
    /*

    const esClient = esClientFactory(
      jest.fn().mockImplementation((params) => {
        index = params.index;
      })
    );
    */

    await getIndices(http, mockIndexPatternCreationType, 'kibana          ', false);
    expect(index).toBe('kibana');
  });

  it('should use the limit', async () => {
    let limit;
    /*
    const esClient = esClientFactory(
      jest.fn().mockImplementation((params) => {
        limit = params.body.aggs.indices.terms.size;
      })
    );
    */
    await getIndices(http, mockIndexPatternCreationType, 'kibana', false);
    expect(limit).toBe(10);
  });

  describe('errors', () => {
    it('should handle errors gracefully', async () => {
      // const esClient = esClientFactory(() => errorResponse);
      const result = await getIndices(http, mockIndexPatternCreationType, 'kibana', false);
      expect(result.length).toBe(0);
    });

    it('should throw exceptions', async () => {
      /*
      const esClient = esClientFactory(() => {
        throw new Error('Fail');
      });
      */

      await expect(
        getIndices(http, mockIndexPatternCreationType, 'kibana', false)
      ).rejects.toThrow();
    });

    it('should handle index_not_found_exception errors gracefully', async () => {
      /*
      const esClient = esClientFactory(
        () => new Promise((resolve, reject) => reject(exceptionResponse))
      );
      */
      const result = await getIndices(http, mockIndexPatternCreationType, 'kibana', false);
      expect(result.length).toBe(0);
    });
  });
});
