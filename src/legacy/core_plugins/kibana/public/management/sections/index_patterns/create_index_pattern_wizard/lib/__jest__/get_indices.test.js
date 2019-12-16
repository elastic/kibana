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

import { getIndices } from '../get_indices';
import successfulResponse from './api/get_indices.success.json';
import errorResponse from './api/get_indices.error.json';
import exceptionResponse from './api/get_indices.exception.json';
const mockIndexPatternCreationType = {
  getIndexPatternType: () => 'default',
  getIndexPatternName: () => 'name',
  checkIndicesForErrors: () => false,
  getShowSystemIndices: () => false,
  renderPrompt: () => {},
  getIndexPatternMappings: () => {
    return {};
  },
  getIndexTags: () => {
    return [];
  },
};

describe('getIndices', () => {
  it('should work in a basic case', async () => {
    const es = {
      search: () => new Promise(resolve => resolve(successfulResponse)),
    };

    const result = await getIndices(es, mockIndexPatternCreationType, 'kibana', 1);
    expect(result.length).toBe(2);
    expect(result[0].name).toBe('1');
    expect(result[1].name).toBe('2');
  });

  it('should ignore ccs query-all', async () => {
    expect((await getIndices(null, mockIndexPatternCreationType, '*:')).length).toBe(0);
  });

  it('should ignore a single comma', async () => {
    expect((await getIndices(null, mockIndexPatternCreationType, ',')).length).toBe(0);
    expect((await getIndices(null, mockIndexPatternCreationType, ',*')).length).toBe(0);
    expect((await getIndices(null, mockIndexPatternCreationType, ',foobar')).length).toBe(0);
  });

  it('should trim the input', async () => {
    let index;
    const es = {
      search: jest.fn().mockImplementation(params => {
        index = params.index;
      }),
    };

    await getIndices(es, mockIndexPatternCreationType, 'kibana          ', 1);
    expect(index).toBe('kibana');
  });

  it('should use the limit', async () => {
    let limit;
    const es = {
      search: jest.fn().mockImplementation(params => {
        limit = params.body.aggs.indices.terms.size;
      }),
    };

    await getIndices(es, mockIndexPatternCreationType, 'kibana', 10);
    expect(limit).toBe(10);
  });

  describe('errors', () => {
    it('should handle errors gracefully', async () => {
      const es = {
        search: () => new Promise(resolve => resolve(errorResponse)),
      };

      const result = await getIndices(es, mockIndexPatternCreationType, 'kibana', 1);
      expect(result.length).toBe(0);
    });

    it('should throw exceptions', async () => {
      const es = {
        search: () => {
          throw new Error('Fail');
        },
      };

      await expect(getIndices(es, mockIndexPatternCreationType, 'kibana', 1)).rejects.toThrow();
    });

    it('should handle index_not_found_exception errors gracefully', async () => {
      const es = {
        search: () => new Promise((resolve, reject) => reject(exceptionResponse)),
      };

      const result = await getIndices(es, mockIndexPatternCreationType, 'kibana', 1);
      expect(result.length).toBe(0);
    });

    it('should throw an exception if no limit is provided', async () => {
      await expect(getIndices({}, mockIndexPatternCreationType, 'kibana')).rejects.toThrow();
    });
  });
});
