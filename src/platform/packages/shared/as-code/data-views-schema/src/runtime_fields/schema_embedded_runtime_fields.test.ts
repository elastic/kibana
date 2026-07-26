/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { savedRuntimeFieldSchema } from './schema_saved_runtime_fields';

describe('schema_embedded_runtime_fields', () => {
  describe('popularity', () => {
    describe('given a primitive runtime field', () => {
      it('accepts popularity at the lower bound (0)', () => {
        const runtimeField = {
          type: 'keyword' as const,
          script: 'some script',
          popularity: 0,
        };

        expect(savedRuntimeFieldSchema.validate(runtimeField)).toEqual(runtimeField);
      });

      it('accepts popularity above the lower bound (10)', () => {
        const runtimeField = {
          type: 'keyword' as const,
          script: 'some script',
          popularity: 10,
        };

        expect(savedRuntimeFieldSchema.validate(runtimeField)).toEqual(runtimeField);
      });

      it('rejects popularity below the lower bound', () => {
        const runtimeField = {
          type: 'keyword' as const,
          script: 'some script',
          popularity: -1,
        };

        expect(() => savedRuntimeFieldSchema.validate(runtimeField)).toThrow(/\[popularity\]/i);
      });
    });

    describe('given a composite runtime field', () => {
      it('accepts popularity at the lower bound (0) on a subfield', () => {
        const runtimeField = {
          type: 'composite' as const,
          script: 'some script',
          fields: {
            my_subfield: {
              type: 'keyword' as const,
              popularity: 0,
            },
          },
        };

        expect(savedRuntimeFieldSchema.validate(runtimeField)).toEqual(runtimeField);
      });

      it('accepts popularity above the lower bound (10) on a subfield', () => {
        const runtimeField = {
          type: 'composite' as const,
          script: 'some script',
          fields: {
            my_subfield: {
              type: 'keyword' as const,
              popularity: 10,
            },
          },
        };

        expect(savedRuntimeFieldSchema.validate(runtimeField)).toEqual(runtimeField);
      });

      it('rejects popularity below the lower bound on a subfield', () => {
        const runtimeField = {
          type: 'composite' as const,
          script: 'some script',
          fields: {
            my_subfield: {
              type: 'keyword' as const,
              popularity: -1,
            },
          },
        };

        expect(() => savedRuntimeFieldSchema.validate(runtimeField)).toThrow(
          /\[fields\.my_subfield\.popularity\]/i
        );
      });
    });
  });
});
