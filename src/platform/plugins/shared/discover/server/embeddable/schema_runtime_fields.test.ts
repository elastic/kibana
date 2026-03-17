/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  PRIMITIVE_RUNTIME_FIELD_TYPES,
  RUNTIME_FIELD_COMPOSITE_TYPE,
} from '@kbn/data-views-plugin/common';
import type {
  compositeRuntimeFieldSchema,
  primitiveRuntimeFieldSchema,
} from './schema_runtime_fields';
import { runtimeFieldsSchema } from './schema_runtime_fields';
import type { TypeOf } from '@kbn/config-schema';

const buildPrimitiveRuntimeField = (
  params: Partial<TypeOf<typeof primitiveRuntimeFieldSchema>>
) => {
  return { type: 'keyword', name: 'my_runtime_field', script: 'some script', ...params };
};

const buildCompositeRuntimeField = (
  params: Partial<TypeOf<typeof compositeRuntimeFieldSchema>>
) => {
  return {
    type: RUNTIME_FIELD_COMPOSITE_TYPE,
    name: 'my_runtime_field',
    script: 'some script',
    fields: [],
    ...params,
  };
};

describe('schema_runtime_fields', () => {
  describe('given an invalid type', () => {
    it('should throw an error', () => {
      // Given
      const runtimeField = {
        type: 'invalid',
      };

      // When/Then
      expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(/\[type/i);
    });
  });

  describe.each(PRIMITIVE_RUNTIME_FIELD_TYPES)('given a %s runtime field', (type) => {
    it('should be a valid type', () => {
      // Given
      const runtimeField = {
        name: 'my_runtime_field',
        type,
      };

      // When/Then
      expect(runtimeFieldsSchema.validate(runtimeField)).toEqual(runtimeField);
    });
  });

  describe('given a composite runtime field', () => {
    it('should be a valid type', () => {
      // Given
      const runtimeField = {
        type: RUNTIME_FIELD_COMPOSITE_TYPE,
        name: 'my_runtime_field',
        fields: [],
      };

      // When/Then
      expect(runtimeFieldsSchema.validate(runtimeField)).toEqual(runtimeField);
    });

    describe('when it does NOT have fields', () => {
      it('should throw an error', () => {
        // Given
        const runtimeField = {
          type: RUNTIME_FIELD_COMPOSITE_TYPE,
          name: 'my_runtime_field',
        };

        // When/Then
        expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(
          /\[fields\]: expected value of type/
        );
      });
    });

    describe('when fields is not an array', () => {
      it('should throw an error', () => {
        // Given
        const runtimeField = buildCompositeRuntimeField({
          // @ts-expect-error - we want to test an invalid type
          fields: { name: 'my_runtime_subfield', type: 'keyword' },
        });

        // When/Then
        expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(
          /\[fields\]: expected value of type/
        );
      });
    });

    describe('when it has too many subfields', () => {
      it('should throw an error', () => {
        // Given
        const runtimeField = buildCompositeRuntimeField({
          fields: Array.from({ length: 101 }, (_, i) => ({
            name: `subfield_${i}`,
            type: 'keyword',
          })),
        });

        // When/Then
        expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(/array size is/);
      });
    });

    describe('when it has subfields', () => {
      describe('when the subfield DOES NOT have a type', () => {
        it('should throw an error', () => {
          // Given
          const runtimeField = buildCompositeRuntimeField({
            fields: [
              {
                name: 'my_runtime_subfield',
                // @ts-expect-error - we want to test an invalid type
                type: undefined,
              },
            ],
          });

          // When/Then
          expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(/\[fields.0/);
        });
      });

      describe('when the subfield has an invalid type', () => {
        it('should throw an error', () => {
          // Given
          const runtimeField = buildCompositeRuntimeField({
            fields: [
              {
                name: 'my_runtime_subfield',
                // @ts-expect-error - we want to test an invalid type
                type: 'invalid',
              },
            ],
          });

          // When/Then
          expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(/\[fields.0/);
        });
      });

      describe('when the subfield DOES NOT have a name', () => {
        it('should throw an error', () => {
          // Given
          const runtimeField = buildCompositeRuntimeField({
            // @ts-expect-error - we want to test an invalid type
            fields: [{ name: undefined, type: 'keyword' }],
          });

          // When/Then
          expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(/\[fields.0.name\]/);
        });
      });

      describe('when the subfield has an empty name', () => {
        it('should throw an error', () => {
          // Given
          const runtimeField = buildCompositeRuntimeField({
            fields: [{ name: '', type: 'keyword' }],
          });

          // When/Then
          expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(/\[fields.0.name\]/);
        });
      });

      describe('when the subfield has a name that is too long', () => {
        it('should throw an error', () => {
          // Given
          const runtimeField = buildCompositeRuntimeField({
            fields: [{ name: 'a'.repeat(1001), type: 'keyword' }],
          });

          // When/Then
          expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(/\[fields.0.name\]/);
        });
      });

      describe('when the subfield has a valid name', () => {
        it('should be valid', () => {
          // Given
          const runtimeField = buildCompositeRuntimeField({
            fields: [{ name: 'my_runtime_field', type: 'keyword' }],
          });

          // When/Then
          expect(runtimeFieldsSchema.validate(runtimeField)).toEqual(runtimeField);
        });
      });
    });

    describe('when it has top-level field formatting settings', () => {
      it('should throw an error', () => {
        // Given
        const runtimeField = buildCompositeRuntimeField({
          // @ts-expect-error - we want to test an invalid type
          format: { type: 'number', params: { decimals: 2 } },
        });

        // When/Then
        expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(
          /definition for this key is missing/
        );
      });
    });

    describe.each(['custom_label', 'custom_description', 'popularity'])(
      'when it has a top-level %s',
      (field) => {
        it('should throw an error', () => {
          // Given
          const runtimeField = buildCompositeRuntimeField({
            [field]: field === 'popularity' ? 1 : 'my_runtime_field',
          });

          // When/Then
          expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(
            /definition for this key is missing/
          );
        });
      }
    );
  });

  describe.each([
    ...PRIMITIVE_RUNTIME_FIELD_TYPES.map((type) => ({
      type,
      build: buildPrimitiveRuntimeField,
      buildWithFields: buildPrimitiveRuntimeField,
    })),
    {
      type: RUNTIME_FIELD_COMPOSITE_TYPE,
      build: buildCompositeRuntimeField,
      buildWithFields: (
        field: Partial<TypeOf<typeof compositeRuntimeFieldSchema>['fields'][number]>
      ) =>
        buildCompositeRuntimeField({
          fields: [{ name: 'my_runtime_subfield', type: 'keyword', ...field }],
        }),
    },
  ])('given a $type runtime field', ({ build, buildWithFields }) => {
    describe('when it DOES NOT have a name', () => {
      it('should throw an error', () => {
        // Given
        const runtimeField = build({ name: undefined });

        // When/Then
        expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(
          /\[name\]: expected value of type/
        );
      });
    });

    describe('when it has an empty name', () => {
      it('should throw an error', () => {
        // Given
        const runtimeField = build({ name: '' });

        // When/Then
        expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(
          /\[name\]: value has length/
        );
      });
    });

    describe('when it has a name that is too long', () => {
      it('should throw an error', () => {
        // Given
        const runtimeField = build({ name: 'a'.repeat(1001) });

        // When/Then
        expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(
          /\[name\]: value has length/
        );
      });
    });

    describe('when it has a valid name', () => {
      it('should be valid', () => {
        // Given
        const runtimeField = build({ name: 'my_runtime_field' });

        // When/Then
        expect(runtimeFieldsSchema.validate(runtimeField)).toEqual(runtimeField);
      });
    });

    describe('when it does NOT have a script', () => {
      it('should be valid', () => {
        // Given
        const runtimeField = build({ script: undefined });

        // When/Then
        expect(runtimeFieldsSchema.validate(runtimeField)).toEqual(runtimeField);
      });
    });

    describe('when it has an empty script', () => {
      it('should throw an error', () => {
        // Given
        const runtimeField = build({ script: '' });

        // When/Then
        expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(
          /\[script\]: value has length/
        );
      });
    });

    describe('when it has a script that is not a string', () => {
      it('should throw an error', () => {
        // Given
        // @ts-expect-error - we want to test an invalid type
        const runtimeField = build({ script: { source: 'some script' } });

        // When/Then
        expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(
          /\[script\]: expected value of type/
        );
      });
    });

    describe('when it has a script that is a string', () => {
      it('should be valid', () => {
        // Given
        const runtimeField = build({ script: 'some script' });

        // When/Then
        expect(runtimeFieldsSchema.validate(runtimeField)).toEqual(runtimeField);
      });
    });

    describe('when it has a format', () => {
      describe('when the format is not a string', () => {
        it('should throw an error', () => {
          // Given
          // @ts-expect-error - we want to test an invalid type
          const runtimeField = buildWithFields({ format: { type: 1, params: 1 } });

          // When/Then
          expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(/format/);
        });
      });

      describe('when the format is a string', () => {
        describe('when the params are not present', () => {
          it('should throw an error', () => {
            // Given
            const runtimeField = buildWithFields({ format: { type: 'number', params: undefined } });

            // When/Then
            expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(/params/);
          });
        });
      });

      describe('when the params are present', () => {
        it('should be valid', () => {
          // Given
          const runtimeField = buildWithFields({
            format: { type: 'number', params: { decimals: 2 } },
          });

          // When/Then
          expect(runtimeFieldsSchema.validate(runtimeField)).toEqual(runtimeField);
        });
      });
    });

    describe.each(['custom_label', 'custom_description'])('given a %s', (field) => {
      describe('when the it is not present', () => {
        it('should be valid', () => {
          // Given
          const runtimeField = buildWithFields({ [field]: undefined });

          // When/Then
          expect(runtimeFieldsSchema.validate(runtimeField)).toEqual(runtimeField);
        });
      });

      describe('when it is not a string', () => {
        it('should throw an error', () => {
          // Given
          const runtimeField = buildWithFields({ [field]: 1 });

          // When/Then
          expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(new RegExp(field));
        });
      });

      describe('when it is a string', () => {
        describe('when it is empty', () => {
          it('should throw an error', () => {
            // Given
            const runtimeField = buildWithFields({ [field]: '' });

            // When/Then
            expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(new RegExp(field));
          });
        });

        describe('when it is a valid string', () => {
          it('should be valid', () => {
            // Given
            const runtimeField = buildWithFields({ [field]: 'my_runtime_field' });

            // When/Then
            expect(runtimeFieldsSchema.validate(runtimeField)).toEqual(runtimeField);
          });
        });
      });
    });

    describe('when it has a popularity', () => {
      describe('when it is not a number', () => {
        it('should throw an error', () => {
          // Given
          // @ts-expect-error - we want to test an invalid type
          const runtimeField = buildWithFields({ popularity: 'a' });

          // When/Then
          expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(/popularity/);
        });
      });

      describe('when it is a number', () => {
        describe('when it is less than 0', () => {
          it('should throw an error', () => {
            // Given
            const runtimeField = buildWithFields({ popularity: -1 });

            // When/Then
            expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow(
              /equal to or greater than/
            );
          });
        });

        describe('when it is 0', () => {
          it('should be valid', () => {
            // Given
            const runtimeField = buildWithFields({ popularity: 0 });

            // When/Then
            expect(runtimeFieldsSchema.validate(runtimeField)).toEqual(runtimeField);
          });
        });

        describe('when it is greater than 0', () => {
          it('should be valid', () => {
            // Given
            const runtimeField = buildWithFields({ popularity: 1 });

            // When/Then
            expect(runtimeFieldsSchema.validate(runtimeField)).toEqual(runtimeField);
          });
        });
      });
    });
  });
});
