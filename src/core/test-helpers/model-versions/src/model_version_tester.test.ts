/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType, SavedObject } from '@kbn/core-saved-objects-server';
import { createModelVersionTestMigrator } from './model_version_tester';

const createObject = (parts: Partial<SavedObject>): SavedObject => {
  return {
    type: 'test-type',
    id: 'test-id',
    attributes: {},
    references: [],
    ...parts,
  };
};

describe('modelVersionTester', () => {
  const testType: SavedObjectsType = {
    name: 'test-type',
    hidden: false,
    namespaceType: 'single',
    mappings: { properties: {} },
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          forwardCompatibility: schema.object(
            {
              fieldV1: schema.string(),
            },
            { unknowns: 'ignore' }
          ),
        },
      },
      2: {
        changes: [
          {
            type: 'data_backfill',
            backfillFn: (document) => {
              return {
                attributes: {
                  fieldAddedInV2: '2',
                },
              };
            },
          },
        ],
        schemas: {
          forwardCompatibility: schema.object(
            {
              fieldV1: schema.string(),
              fieldAddedInV2: schema.string(),
            },
            { unknowns: 'ignore' }
          ),
        },
      },
      3: {
        changes: [
          {
            type: 'data_backfill',
            backfillFn: (doc) => {
              return {
                attributes: {
                  fieldAddedInV3: '3',
                },
              };
            },
          },
        ],
        schemas: {
          forwardCompatibility: schema.object(
            {
              fieldV1: schema.string(),
              fieldAddedInV2: schema.string(),
              fieldAddedInV3: schema.string(),
            },
            { unknowns: 'ignore' }
          ),
        },
      },
      4: {
        changes: [
          {
            type: 'unsafe_transform',
            transformFn: (doc) => {
              doc.attributes = {
                ...doc.attributes,
                fieldUnsafelyAddedInV4: '4',
              };

              return { document: doc };
            },
          },
        ],
        schemas: {
          forwardCompatibility: schema.object(
            {
              fieldV1: schema.string(),
              fieldAddedInV2: schema.string(),
              fieldAddedInV3: schema.string(),
              fieldUnsafelyAddedInV4: schema.string(),
            },
            { unknowns: 'ignore' }
          ),
        },
      },
    },
  };

  it('upward migrate one version', () => {
    const migrator = createModelVersionTestMigrator({ type: testType });

    const obj = createObject({
      attributes: {
        fieldV1: 'v1',
      },
    });

    const migrated = migrator.migrate({ document: obj, fromVersion: 1, toVersion: 2 });

    expect(migrated.attributes).toEqual({
      fieldV1: 'v1',
      fieldAddedInV2: '2',
    });
  });

  it('upward migrate multiple version', () => {
    const migrator = createModelVersionTestMigrator({ type: testType });

    const obj = createObject({
      attributes: {
        fieldV1: 'v1',
      },
    });

    const migrated = migrator.migrate({ document: obj, fromVersion: 1, toVersion: 4 });

    expect(migrated.attributes).toEqual({
      fieldV1: 'v1',
      fieldAddedInV2: '2',
      fieldAddedInV3: '3',
      fieldUnsafelyAddedInV4: '4',
    });
  });

  it('downward migrate one version', () => {
    const migrator = createModelVersionTestMigrator({ type: testType });

    const obj = createObject({
      attributes: {
        fieldV1: 'v1',
        fieldAddedInV2: '2',
        fieldAddedInV3: '3',
        fieldUnsafelyAddedInV4: '4',
      },
    });

    const migrated = migrator.migrate({ document: obj, fromVersion: 4, toVersion: 3 });

    expect(migrated.attributes).toEqual({
      fieldV1: 'v1',
      fieldAddedInV2: '2',
      fieldAddedInV3: '3',
    });
  });

  it('downward migrate multiple versions', () => {
    const migrator = createModelVersionTestMigrator({ type: testType });

    const obj = createObject({
      attributes: {
        fieldV1: 'v1',
        fieldAddedInV2: '2',
        fieldAddedInV3: '3',
        fieldUnsafelyAddedInV4: '4',
      },
    });

    const migrated = migrator.migrate({ document: obj, fromVersion: 4, toVersion: 1 });

    expect(migrated.attributes).toEqual({
      fieldV1: 'v1',
    });
  });
});
