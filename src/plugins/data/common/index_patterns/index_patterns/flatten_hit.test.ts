/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPattern } from './index_pattern';

// @ts-expect-error
import mockLogStashFields from './fixtures/logstash_fields';
import { stubbedSavedObjectIndexPattern } from './fixtures/stubbed_saved_object_index_pattern';

import { fieldFormatsMock } from '../../../../field_formats/common/mocks';
import { flattenHitWrapper } from './flatten_hit';

class MockFieldFormatter {}

fieldFormatsMock.getInstance = jest.fn().mockImplementation(() => new MockFieldFormatter()) as any;

// helper function to create index patterns
function create(id: string) {
  const {
    type,
    version,
    attributes: { timeFieldName, fields, title },
  } = stubbedSavedObjectIndexPattern(id);

  return new IndexPattern({
    spec: {
      id,
      type,
      version,
      timeFieldName,
      fields,
      title,
      runtimeFieldMap: {},
    },
    fieldFormats: fieldFormatsMock,
    shortDotsEnable: false,
    metaFields: [],
  });
}

describe('flattenHit', () => {
  let indexPattern: IndexPattern;

  // create an indexPattern instance for each test
  beforeEach(() => {
    indexPattern = create('test-pattern');
  });

  it('returns sorted object keys that combine _source, fields and metaFields in a defined order', () => {
    const response = flattenHitWrapper(indexPattern, ['_id', '_type', '_score', '_routing'])({
      _id: 'a',
      _source: {
        name: 'first',
      },
      fields: {
        date: ['1'],
        zzz: ['z'],
      },
    });
    const expectedOrder = ['date', 'name', 'zzz', '_id', '_routing', '_score', '_type'];
    expect(Object.keys(response)).toEqual(expectedOrder);
    expect(Object.entries(response).map(([key]) => key)).toEqual(expectedOrder);
  });
});
