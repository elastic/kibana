/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { normalizeSettings } from './normalize_settings';

describe('normalizeSettings', () => {
  describe('adds a missing type if there is a value', () => {
    it('a string value', () => {
      const setting = { name: 'foo', value: 'bar' };
      const settings = { foo: setting };

      expect(normalizeSettings(settings)).toEqual({
        foo: { type: 'string', ...setting },
      });
    });
    it('a boolean value', () => {
      const setting = { name: 'foo', value: true };
      const settings = { foo: setting };

      expect(normalizeSettings(settings)).toEqual({
        foo: { type: 'boolean', ...setting },
      });
    });
    it('an array value', () => {
      const setting = { name: 'foo', value: ['foo', 'bar'] };
      const settings = { foo: setting };

      expect(normalizeSettings(settings)).toEqual({
        foo: { type: 'array', ...setting },
      });
    });
    //
    // can't test a bigint value unless Jest is set to use only one
    // webworker. see: https://github.com/jestjs/jest/issues/11617
    //
    // it('a bigint value', () => {
    //   const setting = { name: 'foo', value: BigInt(9007199254740991) };
    //   const settings = { foo: setting };

    //   expect(normalizeSettings(settings)).toEqual({
    //     foo: { type: 'number', ...setting },
    //   });
    // });
    //
    it('a numeric value', () => {
      const setting = { name: 'foo', value: 10 };
      const settings = { foo: setting };

      expect(normalizeSettings(settings)).toEqual({
        foo: { type: 'number', ...setting },
      });
    });
  });

  it('throws if the value is an object', () => {
    const setting = { name: 'foo', value: { bar: 'baz' } };
    const settings = { foo: setting };

    expect(() => normalizeSettings(settings)).toThrowError(
      `incompatible SettingType: 'foo' type object | {"name":"foo","value":{"bar":"baz"}}`
    );
  });

  it('does nothing if the type and value are already set', () => {
    const setting = { name: 'foo', value: 'bar', type: 'string' as 'string' };
    const settings = { foo: setting };

    expect(normalizeSettings(settings)).toEqual(settings);
  });
});
