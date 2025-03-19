/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isConfigured } from './is_configured';

describe('isConfigured', () => {
  describe('#string', () => {
    it('returns true for a non-empty string', () => {
      expect(isConfigured.string('I am configured')).toEqual(true);
    });

    it('returns false for an empty string', () => {
      expect(isConfigured.string(' ')).toEqual(false);
      expect(isConfigured.string('     ')).toEqual(false);
    });

    it('returns false for undefined', () => {
      expect(isConfigured.string(undefined)).toEqual(false);
    });

    it('returns false for null', () => {
      expect(isConfigured.string(null as any)).toEqual(false);
    });

    it('returns false for a record', () => {
      expect(isConfigured.string({} as any)).toEqual(false);
      expect(isConfigured.string({ key: 'hello' } as any)).toEqual(false);
    });

    it('returns false for an array', () => {
      expect(isConfigured.string([] as any)).toEqual(false);
      expect(isConfigured.string(['hello'] as any)).toEqual(false);
    });
  });

  describe('array', () => {
    it('returns true for a non-empty array', () => {
      expect(isConfigured.array(['a'])).toEqual(true);
      expect(isConfigured.array([{}])).toEqual(true);
      expect(isConfigured.array([{ key: 'hello' }])).toEqual(true);
    });

    it('returns false for an empty array', () => {
      expect(isConfigured.array([])).toEqual(false);
    });

    it('returns false for undefined', () => {
      expect(isConfigured.array(undefined)).toEqual(false);
    });

    it('returns false for null', () => {
      expect(isConfigured.array(null as any)).toEqual(false);
    });

    it('returns false for a string', () => {
      expect(isConfigured.array('string')).toEqual(false);
    });

    it('returns false for a record', () => {
      expect(isConfigured.array({} as any)).toEqual(false);
    });
  });

  describe('stringOrArray', () => {
    const arraySpy = jest.spyOn(isConfigured, 'array');
    const stringSpy = jest.spyOn(isConfigured, 'string');

    it('calls #array for an array', () => {
      isConfigured.stringOrArray([]);
      expect(arraySpy).toHaveBeenCalledWith([]);
    });

    it('calls #string for non-array values', () => {
      isConfigured.stringOrArray('string');
      expect(stringSpy).toHaveBeenCalledWith('string');
    });
  });

  describe('record', () => {
    it('returns true for a non-empty record', () => {
      expect(isConfigured.record({ key: 'hello' })).toEqual(true);
      expect(isConfigured.record({ key: undefined })).toEqual(true);
    });

    it('returns false for an empty record', () => {
      expect(isConfigured.record({})).toEqual(false);
    });
    it('returns false for undefined', () => {
      expect(isConfigured.record(undefined)).toEqual(false);
    });
    it('returns false for null', () => {
      expect(isConfigured.record(null as any)).toEqual(false);
    });
  });

  describe('number', () => {
    it('returns true for a valid number', () => {
      expect(isConfigured.number(0)).toEqual(true);
      expect(isConfigured.number(-0)).toEqual(true);
      expect(isConfigured.number(1)).toEqual(true);
      expect(isConfigured.number(-0)).toEqual(true);
    });

    it('returns false for NaN', () => {
      expect(isConfigured.number(Number.NaN)).toEqual(false);
    });

    it('returns false for a string', () => {
      expect(isConfigured.number('1' as any)).toEqual(false);
      expect(isConfigured.number('' as any)).toEqual(false);
    });

    it('returns false for undefined', () => {
      expect(isConfigured.number(undefined)).toEqual(false);
    });

    it('returns false for null', () => {
      expect(isConfigured.number(null as any)).toEqual(false);
    });
  });
});
