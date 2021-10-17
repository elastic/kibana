/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { tabifyDocs, flattenHit } from './tabify_docs';
import { IndexPattern, DataView } from '../..';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { fieldFormatsMock } from '../../../../field_formats/common/mocks';
import { stubbedSavedObjectIndexPattern } from '../../../../data_views/common/data_view.stub';

class MockFieldFormatter {}

fieldFormatsMock.getInstance = jest.fn().mockImplementation(() => new MockFieldFormatter()) as any;

// helper function to create index patterns
function create(id: string) {
  const {
    type,
    version,
    attributes: { timeFieldName, fields, title },
  } = stubbedSavedObjectIndexPattern(id);

  return new DataView({
    spec: {
      id,
      type,
      version,
      timeFieldName,
      fields: JSON.parse(fields),
      title,
      runtimeFieldMap: {},
    },
    fieldFormats: fieldFormatsMock,
    shortDotsEnable: false,
    metaFields: ['_id', '_type', '_score', '_routing'],
  });
}

describe('tabify_docs', () => {
  describe('flattenHit', () => {
    let indexPattern: DataView;

    // create an indexPattern instance for each test
    beforeEach(() => {
      indexPattern = create('test-pattern');
    });

    it('returns sorted object keys that combine _source, fields and metaFields in a defined order', () => {
      const response = flattenHit(
        {
          _index: 'foobar',
          _id: 'a',
          _source: {
            name: 'first',
          },
          fields: {
            date: ['1'],
            zzz: ['z'],
            _abc: ['a'],
          },
        },
        indexPattern
      );
      const expectedOrder = ['_abc', 'date', 'name', 'zzz', '_id', '_routing', '_score', '_type'];
      expect(Object.keys(response)).toEqual(expectedOrder);
      expect(Object.entries(response).map(([key]) => key)).toEqual(expectedOrder);
    });
  });

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
      metaFields: ['_id', '_index', '_score', '_type'],
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

    it('combines meta fields from index pattern', () => {
      const table = tabifyDocs(response, index);
      expect(table.columns.map((col) => col.id)).toEqual(
        expect.arrayContaining(['_id', '_index', '_score', '_type'])
      );
    });

    it('works without provided index pattern', () => {
      const table = tabifyDocs(response);
      expect(table).toMatchSnapshot();
    });
  });
});
