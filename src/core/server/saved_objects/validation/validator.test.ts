/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsTypeValidator, SavedObjectsValidationMap } from './';

describe('Saved Objects type validator', () => {
  let validator: SavedObjectsTypeValidator;

  const type = 'my-type';
  const validationMap: SavedObjectsValidationMap = {
    '1.0.0': (data) => {
      if (typeof data.foo !== 'string') {
        throw new Error(`[foo]: expected value of type [string] but got [${typeof data.foo}]`);
      }
    },
    '2.0.0': schema.object({
      foo: schema.string(),
    }),
  };

  beforeEach(() => {
    validator = new SavedObjectsTypeValidator({ type, validationMap });
  });

  it('should throw if an invalid mapping is provided', () => {
    const malformedValidationMap = {
      '1.0.0': ['oops'],
    } as unknown as SavedObjectsValidationMap;
    validator = new SavedObjectsTypeValidator({ type, validationMap: malformedValidationMap });

    const data = { foo: false };
    expect(() => validator.validate('1.0.0', data)).toThrowErrorMatchingInlineSnapshot(
      `"The 1.0.0 validation for saved object of type [my-type] is malformed."`
    );
  });

  it('should do nothing if no matching validation could be found', () => {
    const data = { foo: false };
    expect(validator.validate('3.0.0', data)).toBeUndefined();
  });

  it('should not allow custom functions to mutate data', () => {
    const data = { foo: 'not mutated' };

    const mutatingValidationMap: SavedObjectsValidationMap = {
      '1.0.0': (d) => (d.foo = 'mutated'),
    };
    validator = new SavedObjectsTypeValidator({ type, validationMap: mutatingValidationMap });

    expect(validator.validate('1.0.0', data)).toBeUndefined();
    expect(data.foo).toBe('not mutated');
  });

  describe('with valid values', () => {
    it('should work with a custom function', () => {
      const data = { foo: 'hi' };
      expect(() => validator.validate('1.0.0', data)).not.toThrowError();
    });

    it('should work with a schema', () => {
      const data = { foo: 'hi' };
      expect(() => validator.validate('2.0.0', data)).not.toThrowError();
    });
  });

  describe('with invalid values', () => {
    it('should work with a custom function', () => {
      const data = { foo: false };
      expect(() => validator.validate('1.0.0', data)).toThrowErrorMatchingInlineSnapshot(
        `"[foo]: expected value of type [string] but got [boolean]"`
      );
    });

    it('should work with a schema', () => {
      const data = { foo: false };
      expect(() => validator.validate('2.0.0', data)).toThrowErrorMatchingInlineSnapshot(
        `"[foo]: expected value of type [string] but got [boolean]"`
      );
    });
  });
});
