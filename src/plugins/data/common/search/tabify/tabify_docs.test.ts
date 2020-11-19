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

import { tabifyDocs } from './tabify_docs';
import { IndexPattern } from '../../index_patterns/index_patterns';
import { SearchResponse } from 'elasticsearch';

describe('tabifyDocs', () => {
  const fieldFormats = {
    getInstance: (id: string) => ({ toJSON: () => ({ id }) }),
    getDefaultInstance: (id: string) => ({ toJSON: () => ({ id }) }),
  };

  const index = new IndexPattern({
    spec: {
      id: 'test-index',
      fields: {
        sourceTest: { name: 'sourceTest', type: 'number', searchable: true, aggregatable: true },
        fieldTest: { name: 'fieldTest', type: 'number', searchable: true, aggregatable: true },
        'nested.field': {
          name: 'nested.field',
          type: 'number',
          searchable: true,
          aggregatable: true,
        },
      },
    },
    fieldFormats: fieldFormats as any,
  });

  const response = {
    hits: {
      hits: [
        {
          _source: { sourceTest: 123 },
          fields: { fieldTest: 123, invalidMapping: 345, nested: [{ field: 123 }] },
        },
      ],
    },
  } as SearchResponse<unknown>;

  it('converts fields by default', () => {
    const table = tabifyDocs(response, index);
    expect(table).toMatchSnapshot();
  });

  it('converts source if option is set', () => {
    const table = tabifyDocs(response, index, { source: true });
    expect(table).toMatchSnapshot();
  });

  it('skips nested fields if option is set', () => {
    const table = tabifyDocs(response, index, { shallow: true });
    expect(table).toMatchSnapshot();
  });

  it('works without provided index pattern', () => {
    const table = tabifyDocs(response);
    expect(table).toMatchSnapshot();
  });
});
