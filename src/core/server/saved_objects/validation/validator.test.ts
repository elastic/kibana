/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsTypeValidator, SavedObjectsValidationMap } from './';
import { SavedObjectSanitizedDoc } from '../serialization';
import { loggerMock, MockedLogger } from '../../logging/logger.mock';

function isRecord(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

describe('Saved Objects type validator', () => {
  let validator: SavedObjectsTypeValidator;
  let logger: MockedLogger;

  const type = 'my-type';
  const validationMap: SavedObjectsValidationMap = {
    '1.0.0': ({ attributes }) => {
      if (isRecord(attributes) && typeof attributes.foo !== 'string') {
        throw new Error(
          `[foo]: expected value of type [string] but got [${typeof attributes.foo}]`
        );
      }
    },
    '2.0.0': schema.object({
      foo: schema.string(),
    }),
  };

  const createMockObject = (attributes: Record<string, unknown>): SavedObjectSanitizedDoc => ({
    attributes,
    id: 'test-id',
    references: [],
    type,
  });

  beforeEach(() => {
    logger = loggerMock.create();
    validator = new SavedObjectsTypeValidator({ logger, type, validationMap });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should silently skip validation if an invalid mapping is provided', () => {
    const malformedValidationMap = {
      '1.0.0': ['oops'],
    } as unknown as SavedObjectsValidationMap;
    validator = new SavedObjectsTypeValidator({
      logger,
      type,
      validationMap: malformedValidationMap,
    });

    const data = createMockObject({ foo: false });
    expect(() => validator.validate('1.0.0', data)).not.toThrowError();
  });

  it('should do nothing if no matching validation could be found', () => {
    const data = createMockObject({ foo: false });
    expect(validator.validate('3.0.0', data)).toBeUndefined();
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it('should log when attempting to perform validation', () => {
    const data = createMockObject({ foo: 'hi' });
    validator.validate('1.0.0', data);
    expect(logger.debug).toHaveBeenCalledTimes(1);
  });

  describe('with valid values', () => {
    it('should work with a custom function', () => {
      const data = createMockObject({ foo: 'hi' });
      expect(() => validator.validate('1.0.0', data)).not.toThrowError();
    });

    it('should work with a schema', () => {
      const data = createMockObject({ foo: 'hi' });
      expect(() => validator.validate('2.0.0', data)).not.toThrowError();
    });
  });

  describe('with invalid values', () => {
    it('should work with a custom function', () => {
      const data = createMockObject({ foo: false });
      expect(() => validator.validate('1.0.0', data)).toThrowErrorMatchingInlineSnapshot(
        `"[foo]: expected value of type [string] but got [boolean]"`
      );
    });

    it('should work with a schema', () => {
      const data = createMockObject({ foo: false });
      expect(() => validator.validate('2.0.0', data)).toThrowErrorMatchingInlineSnapshot(
        `"[foo]: expected value of type [string] but got [boolean]"`
      );
    });
  });
});
