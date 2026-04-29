/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getOverridesFor, isOnAggBasedEditor } from './utils';

describe('Overrides utilities', () => {
  describe('getOverridesFor', () => {
    it('should return an empty object for undefined values', () => {
      expect(getOverridesFor(undefined, 'settings')).toEqual({});
      // @ts-expect-error
      expect(getOverridesFor({}, 'settings')).toEqual({});
      // @ts-expect-error
      expect(getOverridesFor({ otherOverride: {} }, 'settings')).toEqual({});
    });

    it('should return only the component specific overrides', () => {
      expect(
        getOverridesFor({ otherOverride: { a: 15 }, settings: { b: 10 } }, 'settings')
      ).toEqual({ b: 10 });
    });

    it('should swap any "ignore" value into undefined value', () => {
      expect(
        getOverridesFor({ otherOverride: { a: 15 }, settings: { b: 10, c: 'ignore' } }, 'settings')
      ).toEqual({ b: 10, c: undefined });
    });
  });
});

describe('isOnAggBasedEditor', () => {
  it('should return false if is on dashboard', () => {
    const context = {
      type: 'dashboard',
      description: 'test',
      child: {
        type: 'lens',
        name: 'lnsPie',
        id: 'd8bb29a7-13a4-43fa-a162-d7705050bb6c',
        description: 'test',
        url: '/gdu/app/lens#/edit_by_value',
      },
    };
    expect(isOnAggBasedEditor(context)).toEqual(false);
  });

  it('should return false if is on editor but lens', () => {
    const context = {
      type: 'application',
      description: 'test',
      child: {
        type: 'lens',
        name: 'lnsPie',
        id: 'd8bb29a7-13a4-43fa-a162-d7705050bb6c',
        description: 'test',
        url: '/gdu/app/lens#/edit_by_value',
      },
    };
    expect(isOnAggBasedEditor(context)).toEqual(false);
  });

  it('should return false if is on dashboard but agg_based', () => {
    const context = {
      type: 'dashboard',
      description: 'test',
      child: {
        type: 'agg_based',
        name: 'pie',
        id: 'd8bb29a7-13a4-43fa-a162-d7705050bb6c',
        description: 'test',
        url: '',
      },
    };
    expect(isOnAggBasedEditor(context)).toEqual(false);
  });

  it('should return true if is on editor but agg_based', () => {
    const context = {
      type: 'application',
      description: 'test',
      child: {
        type: 'agg_based',
        name: 'pie',
        id: 'd8bb29a7-13a4-43fa-a162-d7705050bb6c',
        description: 'test',
        url: '',
      },
    };
    expect(isOnAggBasedEditor(context)).toEqual(true);
  });

  it('should return false if child is missing', () => {
    const context = {
      type: 'application',
      description: 'test',
    };
    expect(isOnAggBasedEditor(context)).toEqual(false);
  });

  it('should return false if context is missing', () => {
    expect(isOnAggBasedEditor()).toEqual(false);
  });
});
