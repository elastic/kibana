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

import { normalizeSortRequest } from './normalize_sort_request';
import { SortDirection } from './types';
import { IndexPattern } from '../../../../../plugins/data/public';

jest.mock('ui/new_platform');

describe('SearchSource#normalizeSortRequest', function() {
  const scriptedField = {
    name: 'script string',
    type: 'number',
    scripted: true,
    sortable: true,
    script: 'foo',
    lang: 'painless',
  };
  const murmurScriptedField = {
    ...scriptedField,
    sortable: false,
    name: 'murmur script',
    type: 'murmur3',
  };
  const indexPattern = {
    fields: [scriptedField, murmurScriptedField],
  } as IndexPattern;

  it('should return an array', function() {
    const sortable = { someField: SortDirection.desc };
    const result = normalizeSortRequest(sortable, indexPattern);
    expect(result).toEqual([
      {
        someField: {
          order: SortDirection.desc,
        },
      },
    ]);
    // ensure object passed in is not mutated
    expect(result[0]).not.toBe(sortable);
    expect(sortable).toEqual({ someField: SortDirection.desc });
  });

  it('should make plain string sort into the more verbose format', function() {
    const result = normalizeSortRequest([{ someField: SortDirection.desc }], indexPattern);
    expect(result).toEqual([
      {
        someField: {
          order: SortDirection.desc,
        },
      },
    ]);
  });

  it('should append default sort options', function() {
    const defaultSortOptions = {
      unmapped_type: 'boolean',
    };
    const result = normalizeSortRequest(
      [{ someField: SortDirection.desc }],
      indexPattern,
      defaultSortOptions
    );
    expect(result).toEqual([
      {
        someField: {
          order: SortDirection.desc,
          ...defaultSortOptions,
        },
      },
    ]);
  });

  it('should enable script based sorting', function() {
    const result = normalizeSortRequest(
      {
        [scriptedField.name]: SortDirection.desc,
      },
      indexPattern
    );
    expect(result).toEqual([
      {
        _script: {
          script: {
            source: scriptedField.script,
            lang: scriptedField.lang,
          },
          type: scriptedField.type,
          order: SortDirection.desc,
        },
      },
    ]);
  });

  it('should use script based sorting only on sortable types', function() {
    const result = normalizeSortRequest(
      [
        {
          [murmurScriptedField.name]: SortDirection.asc,
        },
      ],
      indexPattern
    );

    expect(result).toEqual([
      {
        [murmurScriptedField.name]: {
          order: SortDirection.asc,
        },
      },
    ]);
  });

  it('should remove unmapped_type parameter from _score sorting', function() {
    const result = normalizeSortRequest({ _score: SortDirection.desc }, indexPattern, {
      unmapped_type: 'boolean',
    });
    expect(result).toEqual([
      {
        _score: {
          order: SortDirection.desc,
        },
      },
    ]);
  });
});
