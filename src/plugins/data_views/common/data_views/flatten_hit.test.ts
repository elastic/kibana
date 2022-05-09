/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from './data_view';

import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { flattenHitWrapper } from './flatten_hit';
import { stubbedSavedObjectIndexPattern } from '../data_view.stub';

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
    metaFields: [],
  });
}

describe('flattenHit', () => {
  let indexPattern: DataView;

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
        _abc: ['a'],
      },
    });
    const expectedOrder = ['_abc', 'date', 'name', 'zzz', '_id', '_routing', '_score', '_type'];
    expect(Object.keys(response)).toEqual(expectedOrder);
    expect(Object.entries(response).map(([key]) => key)).toEqual(expectedOrder);
  });
});
