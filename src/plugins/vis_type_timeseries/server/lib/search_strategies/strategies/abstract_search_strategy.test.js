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
import { from } from 'rxjs';
import { AbstractSearchStrategy } from './abstract_search_strategy';

describe('AbstractSearchStrategy', () => {
  let abstractSearchStrategy;
  let req;
  let mockedFields;
  let indexPattern;

  beforeEach(() => {
    mockedFields = {};
    req = {
      pre: {
        indexPatternsService: {
          getFieldsForWildcard: jest.fn().mockReturnValue(mockedFields),
        },
      },
    };

    abstractSearchStrategy = new AbstractSearchStrategy('es');
  });

  test('should init an AbstractSearchStrategy instance', () => {
    expect(abstractSearchStrategy.search).toBeDefined();
    expect(abstractSearchStrategy.getFieldsForWildcard).toBeDefined();
    expect(abstractSearchStrategy.checkForViability).toBeDefined();
  });

  test('should return fields for wildcard', async () => {
    const fields = await abstractSearchStrategy.getFieldsForWildcard(req, indexPattern);

    expect(fields).toBe(mockedFields);
    expect(req.pre.indexPatternsService.getFieldsForWildcard).toHaveBeenCalledWith({
      pattern: indexPattern,
      fieldCapsOptions: { allowNoIndices: true },
    });
  });

  test('should return response', async () => {
    const searches = [{ body: 'body', index: 'index' }];
    const searchFn = jest.fn().mockReturnValue(from(Promise.resolve({})));

    const responses = await abstractSearchStrategy.search(
      {
        requestContext: {},
        framework: {
          core: {
            getStartServices: jest.fn().mockReturnValue(
              Promise.resolve([
                {},
                {
                  data: {
                    search: {
                      search: searchFn,
                    },
                  },
                },
              ])
            ),
          },
        },
      },
      searches
    );

    expect(responses).toEqual([{}]);
    expect(searchFn).toHaveBeenCalledWith(
      {
        params: {
          body: 'body',
          index: 'index',
        },
        indexType: undefined,
      },
      {
        strategy: 'es',
      },
      {}
    );
  });
});
