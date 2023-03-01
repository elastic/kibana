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

describe('createFilter', () => {
  it.each([
    { caseName: 'string', caseValue: value },
    { caseName: 'array', caseValue: [value] },
  ])('should return filter with $caseName value', ({ caseValue }) => {
    expect(createFilter({ key: field, value: caseValue, negate: false })).toEqual({
      meta: {
        alias: null,
        disabled: false,
        type: 'phrase',
        key: field,
        negate: false,
        value,
        params: {
          query: value,
        },
      },
      query: {
        match: {
          [field]: {
            query: value,
            type: 'phrase',
          },
        },
      },
    });
  });

  it.each([
    { caseName: 'string', caseValue: value },
    { caseName: 'array', caseValue: [value] },
  ])('should return negate filter with $caseName value', ({ caseValue }) => {
    expect(createFilter({ key: field, value: caseValue, negate: true })).toEqual({
      meta: {
        alias: null,
        disabled: false,
        type: 'phrase',
        key: field,
        negate: true,
        value,
        params: {
          query: value,
        },
      },
      query: {
        match: {
          [field]: {
            query: value,
            type: 'phrase',
          },
        },
      },
    });
  });

  it.each([
    { caseName: 'null', caseValue: null },
    { caseName: 'undefined', caseValue: undefined },
    { caseName: 'empty string', caseValue: '' },
    { caseName: 'empty array', caseValue: [] },
  ])('should return exist filter with $caseName value', ({ caseValue }) => {
    expect(createFilter({ key: field, value: caseValue, negate: false })).toEqual({
      query: {
        exists: {
          field,
        },
      },
      meta: {
        alias: null,
        disabled: false,
        key: field,
        negate: false,
        type: 'exists',
        value: 'exists',
      },
    });
  });

  it.each([
    { caseName: 'null', caseValue: null },
    { caseName: 'undefined', caseValue: undefined },
    { caseName: 'empty string', caseValue: '' },
    { caseName: 'empty array', caseValue: [] },
  ])('should return negate exist filter with $caseName value', ({ caseValue }) => {
    expect(createFilter({ key: field, value: caseValue, negate: true })).toEqual({
      query: {
        exists: {
          field,
        },
      },
      meta: {
        alias: null,
        disabled: false,
        key: field,
        negate: true,
        type: 'exists',
        value: 'exists',
      },
    });
  });
});
