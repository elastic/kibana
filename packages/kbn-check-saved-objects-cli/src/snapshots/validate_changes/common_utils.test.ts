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
import type { ObjectType } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { MigrationInfoRecord } from '../../types';
import {
  extractMappingCompatibleSchemaFields,
  extractMappingCompatibleZodSchemaFields,
  validateAllMappingsInModelVersion,
} from './common_utils';

function normalizePaths(paths: string[]): string[] {
  return [...new Set(paths)].sort();
}

/** Compare Joi internals from a config-schema `ObjectType` to an equivalent Zod object schema. */
function expectMappingPathsMatchConfigSchemaAndZod(
  configObjectSchema: ObjectType,
  zodObjectSchema: z.ZodType
): void {
  const joiPaths = normalizePaths(
    extractMappingCompatibleSchemaFields(configObjectSchema.getSchema())
  );
  const zodPaths = normalizePaths(extractMappingCompatibleZodSchemaFields(zodObjectSchema));
  expect(zodPaths).toEqual(joiPaths);
}

describe('common_utils', () => {
  describe('extractMappingCompatibleSchemaFields (Joi) vs extractMappingCompatibleZodSchemaFields (Zod)', () => {
    it('flat object keys', () => {
      expectMappingPathsMatchConfigSchemaAndZod(
        schema.object({
          title: schema.string(),
          count: schema.number(),
        }),
        z.object({
          title: z.string(),
          count: z.number(),
        })
      );
    });

    it('nested objects', () => {
      expectMappingPathsMatchConfigSchemaAndZod(
        schema.object({
          meta: schema.object({
            author: schema.string(),
            id: schema.number(),
          }),
        }),
        z.object({
          meta: z.object({
            author: z.string(),
            id: z.number(),
          }),
        })
      );
    });

    it('optional leaf fields', () => {
      expectMappingPathsMatchConfigSchemaAndZod(
        schema.object({
          subtitle: schema.maybe(schema.string()),
        }),
        z.object({
          subtitle: z.string().optional(),
        })
      );
    });

    it('arrays of objects (paths from element object)', () => {
      expectMappingPathsMatchConfigSchemaAndZod(
        schema.object({
          rows: schema.arrayOf(
            schema.object({
              id: schema.string(),
            })
          ),
        }),
        z.object({
          rows: z.array(
            z.object({
              id: z.string(),
            })
          ),
        })
      );
    });

    it('union alternatives at a field (string | number)', () => {
      expectMappingPathsMatchConfigSchemaAndZod(
        schema.object({
          value: schema.oneOf([schema.string(), schema.number()]),
        }),
        z.object({
          value: z.union([z.string(), z.number()]),
        })
      );
    });
  });

  describe('extractMappingCompatibleSchemaFields (Joi)', () => {
    it('returns dotted paths for nested properties', () => {
      const joiSchema = schema
        .object({
          kibanaSavedObjectMeta: schema.object({
            searchSourceJSON: schema.maybe(schema.string()),
          }),
        })
        .getSchema();
      expect(normalizePaths(extractMappingCompatibleSchemaFields(joiSchema))).toEqual([
        'kibanaSavedObjectMeta.searchSourceJSON',
      ]);
    });
  });

  describe('extractMappingCompatibleZodSchemaFields (Zod)', () => {
    it('returns dotted paths for nested properties', () => {
      const zodSchema = z.object({
        kibanaSavedObjectMeta: z.object({
          searchSourceJSON: z.string().optional(),
        }),
      });
      expect(normalizePaths(extractMappingCompatibleZodSchemaFields(zodSchema))).toEqual([
        'kibanaSavedObjectMeta.searchSourceJSON',
      ]);
    });

    it('lazy object resolves to field paths', () => {
      interface Row {
        id: string;
      }
      const rowSchema: z.ZodType<Row> = z.lazy(() =>
        z.object({
          id: z.string(),
        })
      );
      expect(
        normalizePaths(extractMappingCompatibleZodSchemaFields(z.object({ row: rowSchema })))
      ).toEqual(['row.id']);
    });
  });

  describe('validateAllMappingsInModelVersion', () => {
    it('throws when latest model version `schemas.create` is not Zod and has no Joi `getSchema()`', () => {
      const typeName = 'unsupported-create-schema';
      const to: MigrationInfoRecord = {
        name: typeName,
        hash: 'hash',
        migrationVersions: [],
        schemaVersions: [],
        modelVersions: [
          {
            version: '1',
            modelVersionHash: 'h',
            changeTypes: [],
            hasTransformation: false,
            newMappings: [],
            schemas: { create: 'h', forwardCompatibility: 'h' },
          },
        ],
        mappings: {},
      };

      const registeredType = {
        name: typeName,
        modelVersions: {
          1: {
            changes: [],
            schemas: {
              create: { plain: 'object-without-getSchema' },
              forwardCompatibility: schema.object({}, { unknowns: 'ignore' }),
            },
          },
        },
      } as unknown as SavedObjectsType;

      expect(() => validateAllMappingsInModelVersion(typeName, to, registeredType)).toThrow(
        `❌ The SO type '${typeName}' has a 'create' schema that is neither a Zod schema nor a Joi schema. Unable to extract fields for validation.`
      );
    });
  });
});
