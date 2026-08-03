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
import type { MigrationInfoRecord, ModelVersionSummary } from '../../types';
import { isSavedObjectsCheckError } from '../../findings';
import {
  extractMappingCompatibleSchemaFields,
  extractMappingCompatibleZodSchemaFields,
  getMappingFieldPaths,
  validateAllMappingsInModelVersion,
  validateNoIndexOrEnabledFalse,
  validateNoIndexOrEnabledFalseInAllMappings,
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

  describe('validateNoIndexOrEnabledFalse', () => {
    const modelVersionWithFlattenedNewMappings: ModelVersionSummary = {
      version: '2',
      modelVersionHash: 'hash',
      changeTypes: ['mappings_addition'],
      hasTransformation: false,
      newMappings: ['category.type', 'category.index', 'category.doc_values'],
      schemas: { create: false, forwardCompatibility: false },
    };

    const toWithIndexFalse: MigrationInfoRecord = {
      name: 'my-type',
      hash: 'hash',
      migrationVersions: [],
      schemaVersions: [],
      modelVersions: [modelVersionWithFlattenedNewMappings],
      mappings: {
        'properties.category.type': 'keyword',
        'properties.category.index': false,
        'properties.category.doc_values': false,
      },
    };

    it('reports each violating field once when newMappings lists multiple flattened paths', () => {
      try {
        validateNoIndexOrEnabledFalse('my-type', toWithIndexFalse, [
          modelVersionWithFlattenedNewMappings,
        ]);
        fail('expected SavedObjectsCheckError');
      } catch (err) {
        expect(isSavedObjectsCheckError(err)).toBe(true);
        if (!isSavedObjectsCheckError(err)) {
          return;
        }
        expect(err.findings).toHaveLength(1);
        expect(err.findings[0].message).toBe(
          "The SO type 'my-type' has new mapping fields with 'index: false': category."
        );
      }
    });
  });

  describe('empty-object field handling (preserved `properties: {}` leaves)', () => {
    // Snapshots now preserve empty object fields as an explicit `properties.<field>.properties: {}`
    // flattened leaf. These tests lock in that the flattened-mapping consumers tolerate that key.
    const mappingsWithEmptyObjectField: Record<string, unknown> = {
      dynamic: false,
      'properties.title.type': 'text',
      'properties.pending_upgrade_review.dynamic': false,
      'properties.pending_upgrade_review.properties': {},
    };

    it('does not derive a spurious field path from an empty-object `properties` leaf', () => {
      // The empty-object leaf collapses to the same parent path as its sibling `dynamic` key,
      // so the field set is exactly { title, pending_upgrade_review } with no `…properties` entry.
      expect(getMappingFieldPaths(mappingsWithEmptyObjectField)).toEqual([
        'pending_upgrade_review',
        'title',
      ]);
    });

    it('does not flag an empty-object field as an index/enabled violation', () => {
      const to: MigrationInfoRecord = {
        name: 'my-type',
        hash: 'hash',
        migrationVersions: [],
        schemaVersions: [],
        modelVersions: [],
        mappings: mappingsWithEmptyObjectField,
      };

      expect(() => validateNoIndexOrEnabledFalseInAllMappings('my-type', to)).not.toThrow();
    });
  });
});
