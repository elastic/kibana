/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { COMPLEX_SPLIT_ACCESSOR, getComplexAccessor } from './accessors';
import { BUCKET_TYPES } from '../../../../data/common';
import { AccessorFn, Datum } from '@elastic/charts';

describe('XY chart datum accessors', () => {
  const aspectBase = {
    accessor: 'col-0-2',
    formatter: (value: Datum) => value,
    aggId: '',
    title: '',
    params: {},
  };

  it('should return complex accessor for IP range aggregation', () => {
    const aspect = {
      aggType: BUCKET_TYPES.IP_RANGE,
      ...aspectBase,
    };
    const accessor = getComplexAccessor(COMPLEX_SPLIT_ACCESSOR)(aspect);
    const datum = {
      'col-0-2': { type: 'range', from: '0.0.0.0', to: '127.255.255.255' },
    };

    expect(typeof accessor).toBe('function');
    expect((accessor as AccessorFn)(datum)).toStrictEqual({
      type: 'range',
      from: '0.0.0.0',
      to: '127.255.255.255',
    });
  });

  it('should return complex accessor for date range aggregation', () => {
    const aspect = {
      aggType: BUCKET_TYPES.DATE_RANGE,
      ...aspectBase,
    };
    const accessor = getComplexAccessor(COMPLEX_SPLIT_ACCESSOR)(aspect);
    const datum = {
      'col-0-2': { from: '1613941200000', to: '1614685113537' },
    };

    expect(typeof accessor).toBe('function');
    expect((accessor as AccessorFn)(datum)).toStrictEqual({
      from: '1613941200000',
      to: '1614685113537',
    });
  });

  it('should return complex accessor when isComplex option set to true', () => {
    const aspect = {
      aggType: BUCKET_TYPES.TERMS,
      ...aspectBase,
    };
    const accessor = getComplexAccessor(COMPLEX_SPLIT_ACCESSOR, true)(aspect);

    expect(typeof accessor).toBe('function');
    expect((accessor as AccessorFn)({ 'col-0-2': 'some value' })).toBe('some value');
  });

  it('should return simple string accessor for not range (date histogram) aggregation', () => {
    const aspect = {
      aggType: BUCKET_TYPES.DATE_HISTOGRAM,
      ...aspectBase,
    };
    const accessor = getComplexAccessor(COMPLEX_SPLIT_ACCESSOR)(aspect);

    expect(typeof accessor).toBe('string');
    expect(accessor).toBe('col-0-2');
  });

  it('should return simple string accessor when aspect has no formatter', () => {
    const aspect = {
      aggType: BUCKET_TYPES.RANGE,
      ...aspectBase,
      formatter: undefined,
    };
    const accessor = getComplexAccessor(COMPLEX_SPLIT_ACCESSOR)(aspect);

    expect(typeof accessor).toBe('string');
    expect(accessor).toBe('col-0-2');
  });

  it('should return undefined when aspect has no accessor', () => {
    const aspect = {
      aggType: BUCKET_TYPES.RANGE,
      ...aspectBase,
      accessor: null,
    };
    const accessor = getComplexAccessor(COMPLEX_SPLIT_ACCESSOR)(aspect);

    expect(accessor).toBeUndefined();
  });
});
