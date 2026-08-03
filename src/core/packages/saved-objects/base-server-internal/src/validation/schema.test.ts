/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { z } from '@kbn/zod';
import type {
  SavedObjectsValidationMap,
  SavedObjectSanitizedDoc,
} from '@kbn/core-saved-objects-server';
import { createSavedObjectSanitizedDocValidator } from './schema';

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

  it('should throw if schema is unknown', () => {
    const mySchema = {} as any;
    expect(() => {
      createSavedObjectSanitizedDocValidator(mySchema);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Unknown attributes schema. Must be defined with \`@kbn/zod\` or \`@kbn/config-schema\`."`
    );
  });

  it('should validate attributes based on provided spec', () => {
    const validate = createSavedObjectSanitizedDocValidator(validationMap['1.0.0']);
    const data = createMockObject({ foo: 'heya' });
    expect(() => validate(data)).not.toThrowError();
  });

  it('should fail if invalid attributes are provided', () => {
    const validate = createSavedObjectSanitizedDocValidator(validationMap['1.0.0']);
    const data = createMockObject({ foo: false });
    expect(() => validate(data)).toThrowErrorMatchingInlineSnapshot(
      `"[attributes.foo]: expected value of type [string] but got [boolean]"`
    );
  });

  it('should fail if invalid id is provided', () => {
    const validate = createSavedObjectSanitizedDocValidator(validationMap['1.0.0']);
    const data = createMockObject({ foo: 'bar' });
    data.id = '';
    expect(() => validate(data)).toThrowErrorMatchingInlineSnapshot(
      `"[id]: value has length [0] but it must have a minimum length of [1]."`
    );
  });

  it('should validate top-level properties', () => {
    const validate = createSavedObjectSanitizedDocValidator(validationMap['1.0.0']);
    const data = createMockObject({ foo: 'heya' });

    expect(() =>
      validate({
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
        accessControl: {
          accessMode: 'default',
          owner: 'user1',
        },
      })
    ).not.toThrowError();
  });

  it('should fail if top-level properties are invalid', () => {
    const validate = createSavedObjectSanitizedDocValidator(validationMap['1.0.0']);
    const data = createMockObject({ foo: 'heya' });
    expect(() =>
      validate({
        ...data,
        // @ts-expect-error - invalid id
        id: false,
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[id]: expected value of type [string] but got [boolean]"`
    );
  });

  describe('default schema', () => {
    it('validates a record of attributes', () => {
      const validate = createSavedObjectSanitizedDocValidator(undefined);
      const data = createMockObject({ foo: 'heya' });

      expect(() => validate(data)).not.toThrowError();
    });

    it('fails validation on undefined attributes', () => {
      const validate = createSavedObjectSanitizedDocValidator(undefined);
      const data = createMockObject(undefined);

      expect(() => validate(data)).toThrowErrorMatchingInlineSnapshot(
        `"[attributes]: expected value of type [object] but got [undefined]"`
      );
    });

    it('fails validation on primitive attributes', () => {
      const validate = createSavedObjectSanitizedDocValidator(undefined);
      const data = createMockObject(42);

      expect(() => validate(data)).toThrowErrorMatchingInlineSnapshot(
        `"[attributes]: expected value of type [object] but got [number]"`
      );
    });

    it('fails validation on incorrect access control', () => {
      const validate = createSavedObjectSanitizedDocValidator(undefined);
      const data = createMockObject({ foo: 'heya' });

      expect(() =>
        validate({
          ...data,
          accessControl: {
            owner: 'user1',
            // @ts-expect-error - invalid accessMode
            accessMode: 'invalid_mode',
          },
        })
      ).toThrow(
        `[accessControl.accessMode]: types that failed validation:
- [accessControl.accessMode.0]: expected value to equal [write_restricted]
- [accessControl.accessMode.1]: expected value to equal [default]`
      );
    });
  });

  describe('using zod for attributes', () => {
    const zodAttributesMap: SavedObjectsValidationMap = {
      '1.0.0': z.object({
        foo: z.string(),
      }),
    };

    it('should validate attributes based on zod spec', () => {
      const validate = createSavedObjectSanitizedDocValidator(zodAttributesMap['1.0.0']);
      const data = createMockObject({ foo: 'heya' });
      expect(() => validate(data)).not.toThrowError();
    });

    it('should fail if invalid attributes are provided', () => {
      const validate = createSavedObjectSanitizedDocValidator(zodAttributesMap['1.0.0']);
      const data = createMockObject({ foo: false });
      expect(() => validate(data)).toThrowErrorMatchingInlineSnapshot(`
        "✖ Invalid input: expected string, received boolean
          → at attributes.foo"
      `);
    });

    it('should fail if invalid id is provided', () => {
      const validate = createSavedObjectSanitizedDocValidator(zodAttributesMap['1.0.0']);
      const data = createMockObject({ foo: 'bar' });
      expect(() =>
        validate({
          ...data,
          id: '',
        })
      ).toThrowErrorMatchingInlineSnapshot(`
        "✖ Too small: expected string to have >=1 characters
          → at id"
      `);
    });
  });
});
