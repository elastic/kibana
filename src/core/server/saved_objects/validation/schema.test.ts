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
    '1.0.0': schema.object({
      foo: schema.string(),
    }),
  };

  const createMockObject = (attributes: unknown): SavedObjectSanitizedDoc => ({
    attributes,
    id: 'test-id',
    references: [],
    type,
  });

  it('should validate attributes based on provided spec', () => {
    const objectSchema = createSavedObjectSanitizedDocSchema(validationMap['1.0.0']);
    const data = createMockObject({ foo: 'heya' });
    expect(() => objectSchema.validate(data)).not.toThrowError();
  });

  it('should fail if invalid attributes are provided', () => {
    const objectSchema = createSavedObjectSanitizedDocSchema(validationMap['1.0.0']);
    const data = createMockObject({ foo: false });
    expect(() => objectSchema.validate(data)).toThrowErrorMatchingInlineSnapshot(
      `"[attributes.foo]: expected value of type [string] but got [boolean]"`
    );
  });

  it('should validate top-level properties', () => {
    const objectSchema = createSavedObjectSanitizedDocSchema(validationMap['1.0.0']);
    const data = createMockObject({ foo: 'heya' });

    expect(() =>
      objectSchema.validate({
        ...data,
        id: 'abc-123',
        type: 'dashboard',
        references: [
          {
            name: 'ref_0',
            type: 'visualization',
            id: '123',
          },
        ],
        namespace: 'a',
        namespaces: ['a', 'b'],
        migrationVersion: {
          dashboard: '1.0.0',
        },
        coreMigrationVersion: '1.0.0',
        updated_at: '2022-01-05T03:17:07.183Z',
        version: '2',
        originId: 'def-456',
      })
    ).not.toThrowError();
  });

  it('should fail if top-level properties are invalid', () => {
    const objectSchema = createSavedObjectSanitizedDocSchema(validationMap['1.0.0']);
    const data = createMockObject({ foo: 'heya' });
    expect(() => objectSchema.validate({ ...data, id: false })).toThrowErrorMatchingInlineSnapshot(
      `"[id]: expected value of type [string] but got [boolean]"`
    );
  });
});
