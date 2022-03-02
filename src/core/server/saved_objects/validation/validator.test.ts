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

describe('Saved Objects type validator', () => {
  let validator: SavedObjectsTypeValidator;
  let logger: MockedLogger;

  const type = 'my-type';
  const validationMap: SavedObjectsValidationMap = {
    '1.0.0': schema.object({
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

  it('should do nothing if no matching validation could be found', () => {
    const data = createMockObject({ foo: false });
    expect(validator.validate('3.0.0', data)).toBeUndefined();
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it('should log when a validation fails', () => {
    const data = createMockObject({ foo: false });
    expect(() => validator.validate('1.0.0', data)).toThrowError();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('should work when given valid values', () => {
    const data = createMockObject({ foo: 'hi' });
    expect(() => validator.validate('1.0.0', data)).not.toThrowError();
  });

  it('should throw an error when given invalid values', () => {
    const data = createMockObject({ foo: false });
    expect(() => validator.validate('1.0.0', data)).toThrowErrorMatchingInlineSnapshot(
      `"[attributes.foo]: expected value of type [string] but got [boolean]"`
    );
  });

  it('should throw an error if fields other than attributes are malformed', () => {
    const data = createMockObject({ foo: 'hi' });
    // @ts-expect-error Intentionally malformed object
    data.updated_at = false;
    expect(() => validator.validate('1.0.0', data)).toThrowErrorMatchingInlineSnapshot(
      `"[updated_at]: expected value of type [string] but got [boolean]"`
    );
  });

  it('works when the validation map is a function', () => {
    const fnValidationMap: () => SavedObjectsValidationMap = () => validationMap;
    validator = new SavedObjectsTypeValidator({
      logger,
      type,
      validationMap: fnValidationMap,
    });

    const data = createMockObject({ foo: 'hi' });
    expect(() => validator.validate('1.0.0', data)).not.toThrowError();
  });
});
