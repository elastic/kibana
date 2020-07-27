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

import { getIndices, responseToItemArray } from './get_indices';
import { IndexPatternCreationConfig } from '../../../../../index_pattern_management/public';
import { httpServiceMock } from '../../../../../../core/public/mocks';
import { ResolveIndexResponseItemIndexAttrs } from '../types';

export const successfulResponse = {
  indices: [
    {
      name: 'remoteCluster1:bar-01',
      attributes: ['open'],
    },
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

const mockIndexPatternCreationType = new IndexPatternCreationConfig({
  type: 'default',
  name: 'name',
  showSystemIndices: false,
  httpClient: {},
  isBeta: false,
});

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

  it('response object to item array', () => {
    const result = {
      indices: [
        {
          name: 'test_index',
        },
        {
          name: 'frozen_index',
          attributes: ['frozen' as ResolveIndexResponseItemIndexAttrs],
        },
      ],
      aliases: [
        {
          name: 'test_alias',
          indices: [],
        },
      ],
      data_streams: [
        {
          name: 'test_data_stream',
          backing_indices: [],
          timestamp_field: 'test_timestamp_field',
        },
      ],
    };
    expect(responseToItemArray(result, mockIndexPatternCreationType)).toMatchSnapshot();
    expect(responseToItemArray({}, mockIndexPatternCreationType)).toEqual([]);
  });

  describe('errors', () => {
    it('should handle errors gracefully', async () => {
      http.get.mockImplementationOnce(() => {
        throw new Error('Test error');
      });
      const result = await getIndices(http, mockIndexPatternCreationType, 'kibana', false);
      expect(result.length).toBe(0);
    });
  });
});
