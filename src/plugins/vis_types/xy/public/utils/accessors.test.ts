/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { COMPLEX_SPLIT_ACCESSOR, getComplexAccessor } from './accessors';
import { AccessorFn, Datum } from '@elastic/charts';
import { KBN_FIELD_TYPES } from '@kbn/field-types';

describe('XY chart datum accessors', () => {
  const formatter = (val: Datum) => JSON.stringify(val);
  const aspectBase = {
    accessor: 'col-0-2',
    formatter,
    id: '',
    title: '',
    params: {},
  };

  const shouldNotApplyFormatterForNotComplexField = (type: string) => {
    const aspect = {
      ...aspectBase,
      format: { id: type },
    };
    const accessor = getComplexAccessor(COMPLEX_SPLIT_ACCESSOR)(aspect);
    const val = 'data';
    const datum = { 'col-0-2': val };
    expect(accessor?.(datum)).toBe(val);
  };

  it('should format IP range aggregation', () => {
    const aspect = {
      ...aspectBase,
      format: { id: 'range' },
    };
    const accessor = getComplexAccessor(COMPLEX_SPLIT_ACCESSOR)(aspect);
    const datum = {
      'col-0-2': { type: 'range', from: '0.0.0.0', to: '127.255.255.255' },
    };

    expect((accessor as AccessorFn)(datum)).toStrictEqual(
      formatter({
        type: 'range',
        from: '0.0.0.0',
        to: '127.255.255.255',
      })
    );
  });

  it('should format date range aggregation', () => {
    const aspect = {
      ...aspectBase,
      format: { id: 'date_range' },
    };
    const accessor = getComplexAccessor(COMPLEX_SPLIT_ACCESSOR)(aspect);
    const datum = {
      'col-0-2': { from: '1613941200000', to: '1614685113537' },
    };

    expect((accessor as AccessorFn)(datum)).toStrictEqual(
      formatter({
        from: '1613941200000',
        to: '1614685113537',
      })
    );
  });

  it(`should not apply formatter for not complex field: ${KBN_FIELD_TYPES.STRING}`, () =>
    shouldNotApplyFormatterForNotComplexField(KBN_FIELD_TYPES.STRING));

  it(`should not apply formatter for not complex field: ${KBN_FIELD_TYPES.NUMBER}`, () =>
    shouldNotApplyFormatterForNotComplexField(KBN_FIELD_TYPES.NUMBER));

  it(`should not apply formatter for not complex field: ${KBN_FIELD_TYPES.DATE}`, () =>
    shouldNotApplyFormatterForNotComplexField(KBN_FIELD_TYPES.DATE));

  it(`should not apply formatter for not complex field: ${KBN_FIELD_TYPES.BOOLEAN}`, () =>
    shouldNotApplyFormatterForNotComplexField(KBN_FIELD_TYPES.BOOLEAN));

  it('should return simple string when aspect has no formatter', () => {
    const aspect = {
      ...aspectBase,
      formatter: undefined,
    };
    const accessor = getComplexAccessor(COMPLEX_SPLIT_ACCESSOR)(aspect);

    const val = 'data';
    const datum = { 'col-0-2': val };

    expect(accessor?.(datum)).toBe(val);
  });

  it('should return undefined when aspect has no accessor', () => {
    const aspect = {
      ...aspectBase,
      accessor: null,
    };
    const datum = { 'col-0-2': 'data' };

    const accessor = getComplexAccessor(COMPLEX_SPLIT_ACCESSOR)(aspect);

    expect(accessor?.(datum)).toBeUndefined();
  });
});
