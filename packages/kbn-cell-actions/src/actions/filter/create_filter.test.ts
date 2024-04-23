/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createFilter } from './create_filter';

const field = 'field.name';
const value = 'the-value';
const numberValue = 123;
const booleanValue = true;
const dataViewId = 'mock-data-view-id';

describe('createFilter', () => {
  it.each([
    { caseName: 'string array', caseValue: [value] },
    { caseName: 'number array', caseValue: [numberValue], query: numberValue.toString() },
    { caseName: 'boolean array', caseValue: [booleanValue], query: booleanValue.toString() },
  ])('should return filter with $caseName value', ({ caseValue, query = value }) => {
    expect(createFilter({ key: field, value: caseValue, negate: false, dataViewId })).toEqual({
      meta: {
        type: 'phrase',
        key: field,
        negate: false,
        params: {
          query,
        },
        index: dataViewId,
      },
      query: {
        match_phrase: {
          [field]: {
            query,
          },
        },
      },
    });
  });

  it.each([
    { caseName: 'string array', caseValue: [value] },
    { caseName: 'number array', caseValue: [numberValue], query: numberValue.toString() },
    { caseName: 'boolean array', caseValue: [booleanValue], query: booleanValue.toString() },
  ])('should return negate filter with $caseName value', ({ caseValue, query = value }) => {
    expect(createFilter({ key: field, value: caseValue, negate: true, dataViewId })).toEqual({
      meta: {
        type: 'phrase',
        key: field,
        negate: true,
        params: {
          query,
        },
        index: dataViewId,
      },
      query: {
        match_phrase: {
          [field]: {
            query,
          },
        },
      },
    });
  });

  it.each([
    { caseName: 'non-negated', negate: false },
    { caseName: 'negated', negate: true },
  ])('should return combined filter with multiple $caseName values', ({ negate }) => {
    const value2 = 'the-value2';
    expect(createFilter({ key: field, value: [value, value2], negate, dataViewId })).toEqual({
      meta: {
        type: 'combined',
        relation: 'AND',
        key: field,
        negate,
        index: dataViewId,
        params: [
          {
            meta: { type: 'phrase', key: field, params: { query: value }, index: dataViewId },
            query: { match_phrase: { [field]: { query: value } } },
          },
          {
            meta: { type: 'phrase', key: field, params: { query: value2 }, index: dataViewId },
            query: { match_phrase: { [field]: { query: value2 } } },
          },
        ],
      },
    });
  });

  it.each([{ caseName: 'empty array', caseValue: [] }])(
    'should return exist filter with $caseName value',
    ({ caseValue }) => {
      expect(createFilter({ key: field, value: caseValue, negate: false, dataViewId })).toEqual({
        query: {
          exists: {
            field,
          },
        },
        meta: {
          index: dataViewId,
          key: field,
          negate: false,
          type: 'exists',
          value: 'exists',
        },
      });
    }
  );

  it.each([{ caseName: 'empty array', caseValue: [] }])(
    'should return negate exist filter with $caseName value',
    ({ caseValue }) => {
      expect(createFilter({ key: field, value: caseValue, negate: true, dataViewId })).toEqual({
        query: {
          exists: {
            field,
          },
        },
        meta: {
          index: dataViewId,
          key: field,
          negate: true,
          type: 'exists',
          value: 'exists',
        },
      });
    }
  );
});
