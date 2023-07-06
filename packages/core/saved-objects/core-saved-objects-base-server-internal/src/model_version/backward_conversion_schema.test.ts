/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { convertModelVersionBackwardConversionSchema } from './backward_conversion_schema';
import type {
  SavedObjectUnsanitizedDoc,
  SavedObjectModelVersionForwardCompatibilityFn,
} from '@kbn/core-saved-objects-server';

describe('convertModelVersionBackwardConversionSchema', () => {
  const createDoc = (
    parts: Partial<SavedObjectUnsanitizedDoc<any>>
  ): SavedObjectUnsanitizedDoc<any> => ({
    id: 'id',
    type: 'type',
    attributes: {},
    ...parts,
  });

  describe('using functions', () => {
    it('converts the schema', () => {
      const conversionSchema: jest.MockedFunction<SavedObjectModelVersionForwardCompatibilityFn> =
        jest.fn();
      conversionSchema.mockImplementation((attrs) => attrs);

      const doc = createDoc({ attributes: { foo: 'bar' } });
      const converted = convertModelVersionBackwardConversionSchema(conversionSchema);

      const output = converted(doc);

      expect(conversionSchema).toHaveBeenCalledTimes(1);
      expect(conversionSchema).toHaveBeenCalledWith({ foo: 'bar' });
      expect(output).toEqual(doc);
    });

    it('returns the document with the updated properties', () => {
      const conversionSchema: jest.MockedFunction<
        SavedObjectModelVersionForwardCompatibilityFn<any, any>
      > = jest.fn();
      conversionSchema.mockImplementation((attrs) => ({ foo: attrs.foo }));

      const doc = createDoc({ attributes: { foo: 'bar', hello: 'dolly' } });
      const converted = convertModelVersionBackwardConversionSchema(conversionSchema);

      const output = converted(doc);

      expect(output).toEqual({
        ...doc,
        attributes: { foo: 'bar' },
      });
    });

    it('throws if the function throws', () => {
      const conversionSchema: jest.MockedFunction<
        SavedObjectModelVersionForwardCompatibilityFn<any, any>
      > = jest.fn();
      conversionSchema.mockImplementation(() => {
        throw new Error('dang');
      });

      const doc = createDoc({});
      const converted = convertModelVersionBackwardConversionSchema(conversionSchema);

      expect(() => converted(doc)).toThrowErrorMatchingInlineSnapshot(`"dang"`);
    });
  });

  describe('using config-schemas', () => {
    it('converts the schema', () => {
      const conversionSchema = schema.object(
        {
          foo: schema.maybe(schema.string()),
        },
        { unknowns: 'ignore' }
      );
      const validateSpy = jest.spyOn(conversionSchema, 'validate');

      const doc = createDoc({ attributes: { foo: 'bar' } });
      const converted = convertModelVersionBackwardConversionSchema(conversionSchema);

      const output = converted(doc);

      expect(validateSpy).toHaveBeenCalledTimes(1);
      expect(validateSpy).toHaveBeenCalledWith({ foo: 'bar' }, {});
      expect(output).toEqual(doc);
    });

    it('returns the document with the updated properties', () => {
      const conversionSchema = schema.object(
        {
          foo: schema.maybe(schema.string()),
        },
        { unknowns: 'ignore' }
      );

      const doc = createDoc({ attributes: { foo: 'bar', hello: 'dolly' } });
      const converted = convertModelVersionBackwardConversionSchema(conversionSchema);

      const output = converted(doc);

      expect(output).toEqual({
        ...doc,
        attributes: {
          foo: 'bar',
        },
      });
    });

    it('throws if the validation throws', () => {
      const conversionSchema = schema.object(
        {
          foo: schema.maybe(schema.string()),
        },
        { unknowns: 'forbid' }
      );

      const doc = createDoc({ attributes: { foo: 'bar', hello: 'dolly' } });
      const converted = convertModelVersionBackwardConversionSchema(conversionSchema);

      expect(() => converted(doc)).toThrowErrorMatchingInlineSnapshot(
        `"[hello]: definition for this key is missing"`
      );
    });
  });
});
