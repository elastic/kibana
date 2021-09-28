/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { tabifyDocs } from './tabify_docs';
import { IndexPattern } from '../..';
import type { estypes } from '@elastic/elasticsearch';

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

  // @ts-expect-error not full inteface
  const response = {
    hits: {
      hits: [
        {
          _id: 'hit-id-value',
          _index: 'hit-index-value',
          _type: 'hit-type-value',
          _score: 77,
          _source: { sourceTest: 123 },
          fields: { fieldTest: 123, invalidMapping: 345, nested: [{ field: 123 }] },
        },
      ],
    },
  } as estypes.SearchResponse<unknown>;

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

  it('combines meta fields if meta option is set', () => {
    const table = tabifyDocs(response, index, { meta: true });
    expect(table).toMatchSnapshot();
  });

  it('works without provided index pattern', () => {
    const table = tabifyDocs(response);
    expect(table).toMatchSnapshot();
  });
});
