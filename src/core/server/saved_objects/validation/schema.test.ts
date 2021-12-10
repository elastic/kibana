/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsValidationMap } from './';
import { SavedObjectSanitizedDoc } from '../serialization';
import { createSavedObjectSanitizedDocSchema } from './schema';

describe('Saved Objects type validation schema', () => {
  const type = 'my-type';
  const validationMap: SavedObjectsValidationMap = {
    '1.0.0': (data) => data,
    '2.0.0': schema.object({
      foo: schema.string(),
    }),
  };

  const createMockObject = (attributes: unknown): SavedObjectSanitizedDoc => ({
    attributes,
    id: 'test-id',
    references: [],
    type,
  });

  it('should use generic validation on attributes if a config schema is not provided', () => {
    const objectSchema = createSavedObjectSanitizedDocSchema(validationMap['1.0.0']);
    const data = createMockObject({ foo: false });
    expect(() => objectSchema.validate(data)).not.toThrowError();
  });

  it('should fail if attributes do not match generic validation', () => {
    const objectSchema = createSavedObjectSanitizedDocSchema(validationMap['2.0.0']);
    const data = createMockObject('oops');
    expect(() => objectSchema.validate(data)).toThrowErrorMatchingInlineSnapshot(
      `"[attributes]: could not parse object value from json input"`
    );
  });

  it('should use config schema if provided', () => {
    const objectSchema = createSavedObjectSanitizedDocSchema(validationMap['2.0.0']);
    const data = createMockObject({ foo: false });
    expect(() => objectSchema.validate(data)).toThrowErrorMatchingInlineSnapshot(
      `"[attributes.foo]: expected value of type [string] but got [boolean]"`
    );
  });
});
