/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RUNTIME_FIELD_TYPES, runtimeFieldsSchema } from './schema.runtime_fields';

describe('schema.runtime_fields', () => {
  describe('given an invalid type', () => {
    it('should throw an error', () => {
      // Given
      const runtimeField = {
        type: 'invalid',
      };

      // When/Then
      expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow();
    });
  });

  describe('given a composite runtime field', () => {
    describe('when it DOES NOT have a name', () => {
      it('should be invalid', () => {
        // Given
        const runtimeField = {
          type: 'composite',
          script: 'some script',
          fields: [],
        };

        // When/Then
        expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow();
      });
    });

    describe('when there are no fields', () => {
      it('should be valid', () => {
        // Given
        const runtimeField = {
          type: 'composite',
          name: 'my_runtime_field',
          script: 'some script',
          fields: [],
        };

        // When/Then
        expect(runtimeFieldsSchema.validate(runtimeField)).toBeTruthy();
      });
    });

    describe('when it has a single field', () => {
      describe.each(RUNTIME_FIELD_TYPES)('when it is of %s type', (type) => {
        it('should be valid', () => {
          // Given
          const runtimeField = {
            type: 'composite',
            name: 'my_runtime_field',
            script: 'some script',
            fields: [{ type, name: 'my_field' }],
          };

          // When/Then
          expect(runtimeFieldsSchema.validate(runtimeField)).toBeTruthy();
        });
      });
    });

    describe('when it has a multiple fields', () => {
      describe.each(RUNTIME_FIELD_TYPES)('when they are of %s type', (type) => {
        it('should be valid', () => {
          // Given
          const runtimeField = {
            type: 'composite',
            name: 'my_runtime_field',
            script: 'some script',
            fields: [
              { type, name: 'my_field' },
              { type, name: 'my_field_2' },
            ],
          };

          // When/Then
          expect(runtimeFieldsSchema.validate(runtimeField)).toBeTruthy();
        });
      });

      describe('when they are of different types', () => {
        describe.each([
          [['keyword', 'long']],
          [['long', 'keyword']],
          [['keyword', 'long', 'keyword']],
          [['geo_point', 'boolean']],
          [['ip', 'date']],
        ])('when they are of %s types', (types: string[]) => {
          it('should be valid', () => {
            // Given
            const runtimeField = {
              type: 'composite',
              name: 'my_runtime_field',
              script: 'some script',
              fields: types.map((type) => ({ type, name: `my_field_${type}` })),
            };

            // When/Then
            expect(runtimeFieldsSchema.validate(runtimeField)).toBeTruthy();
          });
        });
      });
    });
  });

  describe.each(RUNTIME_FIELD_TYPES)('given a %s runtime field', (type) => {
    describe('when it has a name', () => {
      it('should be valid', () => {
        // Given
        const runtimeField = {
          type,
          name: 'my_runtime_field',
        };

        // When/Then
        expect(runtimeFieldsSchema.validate(runtimeField)).toBeTruthy();
      });
    });

    describe('when it does NOT have a name', () => {
      it('should throw an error', () => {
        // Given
        const runtimeField = {
          type,
        };

        // When/Then
        expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow();
      });
    });

    describe('when it has a script', () => {
      describe('when it is a string', () => {
        it('should be valid', () => {
          // Given
          const runtimeField = {
            type,
            name: 'my_runtime_field',
            script: 'some script',
          };

          // When/Then
          expect(runtimeFieldsSchema.validate(runtimeField)).toBeTruthy();
        });
      });

      describe('when it is NOT a string', () => {
        it('should throw an error', () => {
          // Given
          const runtimeField = {
            type,
            name: 'my_runtime_field',
            script: { source: 'some script' },
          };

          // When/Then
          expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow();
        });
      });
    });

    describe('when it has a format', () => {
      describe('when it is a valid format', () => {
        it('should be valid', () => {
          // Given
          const runtimeField = {
            type,
            name: 'my_runtime_field',
            script: 'some script',
            format: { type: 'number', params: {} },
          };

          // When/Then
          expect(runtimeFieldsSchema.validate(runtimeField)).toBeTruthy();
        });
      });

      describe('when it is NOT a valid format', () => {
        it('should throw an error', () => {
          // Given
          const runtimeField = {
            type,
            name: 'my_runtime_field',
            script: 'some script',
            format: { type: 'number', decimals: 2 },
          };

          // When/Then
          expect(() => runtimeFieldsSchema.validate(runtimeField)).toThrow();
        });
      });
    });
  });
});
