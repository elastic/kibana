/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import fs from 'fs';
import { createHash } from 'crypto';
import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { validateChangesExistingType } from './existing_type';
import type { MigrationInfoRecord, MigrationSnapshot } from '../../types';

function loadSnapshot(filename: string): MigrationSnapshot {
  const filePath = path.join(__dirname, '..', 'mocks', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

describe('validateChangesExistingType', () => {
  const log = jest.fn();
  beforeEach(() => jest.clearAllMocks());

  const validateChangesWrapper = ({
    from,
    to,
    type,
  }: {
    from: MigrationSnapshot;
    to: MigrationSnapshot;
    type: Partial<SavedObjectsType> & { name: string };
  }) => {
    const typeFrom = from.typeDefinitions[type.name];
    const typeTo = to.typeDefinitions[type.name];
    const registeredType: SavedObjectsType = {
      ...{
        name: '',
        namespaceType: 'agnostic',
        hidden: false,
        mappings: { dynamic: false, properties: {} },
        modelVersions: {},
      },
      ...type,
    };
    return validateChangesExistingType({ from: typeFrom, to: typeTo, registeredType, log });
  };

  it('should throw if migrations are deleted', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('migrations_deleted.json');

    expect(() => validateChangesWrapper({ from, to, type: { name: 'config' } })).toThrowError(
      `Modifications have been detected in the 'config.migrations'. This property is deprecated and no modifications are allowed.`
    );
  });

  it('should throw if new migrations are added', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('migrations_added.json');

    expect(() => validateChangesWrapper({ from, to, type: { name: 'config' } })).toThrowError(
      `Modifications have been detected in the 'config.migrations'. This property is deprecated and no modifications are allowed.`
    );
  });

  it('should throw if modelVersions are deleted', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('model_versions_deleted.json');

    expect(() => validateChangesWrapper({ from, to, type: { name: 'task' } })).toThrowError(
      `Some model versions have been deleted for SO type 'task'.`
    );
  });

  it('should throw if more than one new model version is defined', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('two_new_model_versions.json');
    expect(() => validateChangesWrapper({ from, to, type: { name: 'task' } })).toThrowError(
      `The SO type 'task' is defining 2 new model versions, but can only define one at a time.`
    );
  });

  it('should throw if existing model versions are mutated', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('mutated_model_versions.json');

    expect(() => validateChangesWrapper({ from, to, type: { name: 'task' } })).toThrowError(
      `Some modelVersions have been structurally updated for SO type 'task' after they were defined: 10.6.0.`
    );
  });

  describe('schema-only changes in the latest model version', () => {
    it('should warn (not throw) when a constraint is tightened in the latest model version schemas', () => {
      const from = loadSnapshot('schema_only_change_in_latest_model_version.json');
      const to = loadSnapshot('schema_only_change_in_latest_model_version_updated.json');

      expect(() => validateChangesWrapper({ from, to, type: { name: 'task' } })).not.toThrow();
      expect(log).toHaveBeenCalledWith(expect.stringContaining('WARNING'));
      expect(log).toHaveBeenCalledWith(expect.stringContaining("'task'"));
    });

    it('should warn (not throw) when a schema change is detected in a non-latest model version', () => {
      const from = loadSnapshot('schema_only_change_in_latest_model_version.json');
      const to = loadSnapshot('schema_only_change_in_older_model_version.json');

      expect(() => validateChangesWrapper({ from, to, type: { name: 'task' } })).not.toThrow();
      expect(log).toHaveBeenCalledWith(expect.stringContaining('WARNING'));
      expect(log).toHaveBeenCalledWith(expect.stringContaining("'task'"));
    });

    it('should throw when a field is removed from the create schema', () => {
      const from = loadSnapshot('schema_only_change_in_latest_model_version.json');
      const typeFrom = from.typeDefinitions.task;
      const typeTo = {
        ...typeFrom,
        modelVersions: typeFrom.modelVersions.map((mv) => {
          if (mv.version !== '3') return mv;
          return {
            ...mv,
            modelVersionHash: 'changed-hash',
            schemas: {
              forwardCompatibility: mv.schemas.forwardCompatibility,
              // Remove 'partition' from the create schema
              create: {
                type: 'object',
                keys: { taskType: { type: 'string' }, status: { type: 'string' } },
              },
            },
          };
        }),
      };
      const registeredType: SavedObjectsType = {
        name: 'task',
        namespaceType: 'agnostic',
        hidden: false,
        mappings: { dynamic: false, properties: {} },
        modelVersions: {},
      };
      expect(() =>
        validateChangesExistingType({ from: typeFrom, to: typeTo, registeredType, log })
      ).toThrowError(/Breaking schema changes.*field 'partition' removed from create schema/s);
    });

    it('should throw when a required field is added to the create schema', () => {
      const from = loadSnapshot('schema_only_change_in_latest_model_version.json');
      const typeFrom = from.typeDefinitions.task;
      const typeTo = {
        ...typeFrom,
        modelVersions: typeFrom.modelVersions.map((mv) => {
          if (mv.version !== '3') return mv;
          return {
            ...mv,
            modelVersionHash: 'changed-hash',
            schemas: {
              forwardCompatibility: mv.schemas.forwardCompatibility,
              create: {
                type: 'object',
                keys: {
                  taskType: { type: 'string' },
                  status: { type: 'string' },
                  partition: { type: 'number' },
                  newRequiredField: { type: 'string' },
                },
              },
            },
          };
        }),
      };
      const registeredType: SavedObjectsType = {
        name: 'task',
        namespaceType: 'agnostic',
        hidden: false,
        mappings: { dynamic: false, properties: {} },
        modelVersions: {},
      };
      expect(() =>
        validateChangesExistingType({ from: typeFrom, to: typeTo, registeredType, log })
      ).toThrowError(
        /Breaking schema changes.*required field 'newRequiredField' added to create schema/s
      );
    });

    it('should throw when a required field is added to the forwardCompatibility schema', () => {
      const from = loadSnapshot('schema_only_change_in_latest_model_version.json');
      const typeFrom = from.typeDefinitions.task;
      const typeTo = {
        ...typeFrom,
        modelVersions: typeFrom.modelVersions.map((mv) => {
          if (mv.version !== '3') return mv;
          return {
            ...mv,
            modelVersionHash: 'changed-hash',
            schemas: {
              create: mv.schemas.create,
              forwardCompatibility: {
                type: 'object',
                keys: {
                  taskType: { type: 'string' },
                  status: { type: 'string' },
                  partition: { type: 'number' },
                  newRequiredField: { type: 'string' },
                },
              },
            },
          };
        }),
      };
      const registeredType: SavedObjectsType = {
        name: 'task',
        namespaceType: 'agnostic',
        hidden: false,
        mappings: { dynamic: false, properties: {} },
        modelVersions: {},
      };
      expect(() =>
        validateChangesExistingType({ from: typeFrom, to: typeTo, registeredType, log })
      ).toThrowError(
        /Breaking schema changes.*required field 'newRequiredField' added to forwardCompatibility schema/s
      );
    });

    it('should throw when a field changes from optional to required in the forwardCompatibility schema', () => {
      const from = loadSnapshot('schema_only_change_in_latest_model_version.json');
      const typeFrom = from.typeDefinitions.task;
      const typeTo = {
        ...typeFrom,
        modelVersions: typeFrom.modelVersions.map((mv) => {
          if (mv.version !== '3') return mv;
          return {
            ...mv,
            modelVersionHash: 'changed-hash',
            schemas: {
              create: mv.schemas.create,
              forwardCompatibility: {
                type: 'object',
                keys: {
                  taskType: { type: 'string' },
                  status: { type: 'string' },
                  // partition was optional (no flags), now explicitly required
                  partition: { type: 'number' },
                  newField: { type: 'string', flags: { presence: 'optional' } },
                },
              },
            },
          };
        }),
      };
      // Simulate "partition" changing from optional to required by adjusting baseline
      const typeFromWithOptionalPartition = {
        ...typeFrom,
        modelVersions: typeFrom.modelVersions.map((mv) => {
          if (mv.version !== '3') return mv;
          return {
            ...mv,
            schemas: {
              ...mv.schemas,
              forwardCompatibility: {
                type: 'object',
                keys: {
                  taskType: { type: 'string' },
                  status: { type: 'string' },
                  partition: { type: 'number', flags: { presence: 'optional' } },
                },
              },
            },
          };
        }),
      };
      const registeredType: SavedObjectsType = {
        name: 'task',
        namespaceType: 'agnostic',
        hidden: false,
        mappings: { dynamic: false, properties: {} },
        modelVersions: {},
      };
      expect(() =>
        validateChangesExistingType({
          from: typeFromWithOptionalPartition,
          to: typeTo,
          registeredType,
          log,
        })
      ).toThrowError(
        /Breaking schema changes.*'partition' changed from optional to required in forwardCompatibility schema/s
      );
    });

    it('should not throw and allow silently when a new optional field is added to the create schema', () => {
      const from = loadSnapshot('schema_only_change_in_latest_model_version.json');
      const typeFrom = from.typeDefinitions.task;
      const typeTo = {
        ...typeFrom,
        modelVersions: typeFrom.modelVersions.map((mv) => {
          if (mv.version !== '3') return mv;
          return {
            ...mv,
            modelVersionHash: 'changed-hash',
            schemas: {
              forwardCompatibility: mv.schemas.forwardCompatibility,
              create: {
                type: 'object',
                keys: {
                  taskType: { type: 'string' },
                  status: { type: 'string' },
                  partition: { type: 'number' },
                  newOptionalField: { type: 'string', flags: { presence: 'optional' } },
                },
              },
            },
          };
        }),
      };
      const registeredType: SavedObjectsType = {
        name: 'task',
        namespaceType: 'agnostic',
        hidden: false,
        mappings: { dynamic: false, properties: {} },
        modelVersions: {},
      };
      expect(() =>
        validateChangesExistingType({ from: typeFrom, to: typeTo, registeredType, log })
      ).not.toThrow();
      // "non-breaking" path: logs a warning noting all changes are non-breaking
      expect(log).toHaveBeenCalledWith(expect.stringContaining('WARNING'));
    });

    it('should throw when the create schema is removed from an existing model version', () => {
      const from = loadSnapshot('schema_only_change_in_latest_model_version.json');
      const typeFrom = from.typeDefinitions.task;
      const typeTo = {
        ...typeFrom,
        modelVersions: typeFrom.modelVersions.map((mv) => {
          if (mv.version !== '3') return mv;
          return {
            ...mv,
            modelVersionHash: 'changed-hash',
            schemas: {
              forwardCompatibility: mv.schemas.forwardCompatibility,
              create: false as const,
            },
          };
        }),
      };
      const registeredType: SavedObjectsType = {
        name: 'task',
        namespaceType: 'agnostic',
        hidden: false,
        mappings: { dynamic: false, properties: {} },
        modelVersions: {},
      };
      expect(() =>
        validateChangesExistingType({ from: typeFrom, to: typeTo, registeredType, log })
      ).toThrowError(/Breaking schema changes.*create schema removed from model version/s);
    });

    it('should throw when the forwardCompatibility schema is removed from an existing model version', () => {
      const from = loadSnapshot('schema_only_change_in_latest_model_version.json');
      const typeFrom = from.typeDefinitions.task;
      const typeTo = {
        ...typeFrom,
        modelVersions: typeFrom.modelVersions.map((mv) => {
          if (mv.version !== '3') return mv;
          return {
            ...mv,
            modelVersionHash: 'changed-hash',
            schemas: {
              create: mv.schemas.create,
              forwardCompatibility: false as const,
            },
          };
        }),
      };
      const registeredType: SavedObjectsType = {
        name: 'task',
        namespaceType: 'agnostic',
        hidden: false,
        mappings: { dynamic: false, properties: {} },
        modelVersions: {},
      };
      expect(() =>
        validateChangesExistingType({ from: typeFrom, to: typeTo, registeredType, log })
      ).toThrowError(
        /Breaking schema changes.*forwardCompatibility schema removed from model version/s
      );
    });

    it('should not flag an unchanged function-based schema when comparing against a legacy hash baseline', () => {
      // Old snapshots stored function-based forwardCompatibility schemas as SHA256(fn.toString()).
      // The new format stores { __fn: fn.toString() }. Verify no false positive is raised.
      const fnSource = 'function(doc) { return doc; }';
      const oldHash = createHash('sha256').update(fnSource).digest('hex');

      const from = loadSnapshot('schema_only_change_in_latest_model_version.json');
      const typeFrom = {
        ...from.typeDefinitions.task,
        modelVersions: from.typeDefinitions.task.modelVersions.map((mv) => ({
          ...mv,
          schemas: {
            create: oldHash as unknown as false,
            forwardCompatibility: oldHash as unknown as false,
          },
        })),
      };
      const typeTo = {
        ...from.typeDefinitions.task,
        modelVersions: from.typeDefinitions.task.modelVersions.map((mv) => ({
          ...mv,
          schemas: {
            create: { __fn: fnSource } as unknown as false,
            forwardCompatibility: { __fn: fnSource } as unknown as false,
          },
        })),
      };
      const registeredType: SavedObjectsType = {
        name: 'task',
        namespaceType: 'agnostic',
        hidden: false,
        mappings: { dynamic: false, properties: {} },
        modelVersions: {},
      };
      // Schemas are effectively unchanged — no schema-diff error or warning should be produced.
      // (An unrelated ignore_above warning may still be logged for pre-existing keyword fields.)
      expect(() =>
        validateChangesExistingType({ from: typeFrom, to: typeTo, registeredType, log })
      ).not.toThrow();
      expect(log).not.toHaveBeenCalledWith(expect.stringContaining('Schema'));
    });

    it('should throw when comparing against a hash-based baseline (cannot diff)', () => {
      const from = loadSnapshot('schema_only_change_in_latest_model_version.json');
      // Simulate a hash-based baseline by replacing schema objects with fake hash strings
      const typeFrom = {
        ...from.typeDefinitions.task,
        modelVersions: from.typeDefinitions.task.modelVersions.map((mv) => ({
          ...mv,
          schemas: {
            create:
              'aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666000011112222333' as unknown as false,
            forwardCompatibility:
              'bbbb2222cccc3333dddd4444eeee5555ffff666600001111222233334444555' as unknown as false,
          },
        })),
      };
      const to = loadSnapshot('schema_only_change_in_latest_model_version_updated.json');
      const registeredType: SavedObjectsType = {
        name: 'task',
        namespaceType: 'agnostic',
        hidden: false,
        mappings: { dynamic: false, properties: {} },
        modelVersions: {},
      };
      expect(() =>
        validateChangesExistingType({
          from: typeFrom,
          to: to.typeDefinitions.task,
          registeredType,
          log,
        })
      ).toThrowError(/baseline snapshot uses the legacy hash format/);
    });

    it('should throw when the registered type schema does not cover all mapping fields', () => {
      const from = loadSnapshot('schema_only_change_in_latest_model_version.json');
      const to = loadSnapshot('schema_only_change_in_latest_model_version_updated.json');

      // Only 'taskType' is declared - 'partition' and 'status' are missing from the schema
      const modelVersions = {
        1: {
          changes: [],
          schemas: {
            create: schema.object({ taskType: schema.string() }),
            forwardCompatibility: schema.object(
              { taskType: schema.string() },
              { unknowns: 'ignore' }
            ),
          },
        },
      } as unknown as SavedObjectsType['modelVersions'];

      expect(() =>
        validateChangesWrapper({ from, to, type: { name: 'task', modelVersions } })
      ).toThrowError(
        /The SO type 'task' has mapping fields not present in the latest model version schema: partition, status/
      );
    });

    it('should not throw when the registered type schema covers all mapping fields', () => {
      const from = loadSnapshot('schema_only_change_in_latest_model_version.json');
      const to = loadSnapshot('schema_only_change_in_latest_model_version_updated.json');

      const taskFields = {
        taskType: schema.string(),
        status: schema.string(),
        partition: schema.string(),
      };
      const modelVersions = {
        1: {
          changes: [],
          schemas: {
            create: schema.object(taskFields),
            forwardCompatibility: schema.object(taskFields, { unknowns: 'ignore' }),
          },
        },
      } as unknown as SavedObjectsType['modelVersions'];

      expect(() =>
        validateChangesWrapper({ from, to, type: { name: 'task', modelVersions } })
      ).not.toThrow();
    });
  });

  describe('schema-only changes in existing versions when adding a new model version', () => {
    // Scenario: a schema-only change was applied to model version 3 (approved by CI) and
    // a developer subsequently adds model version 4 in the same PR or a later one.
    // Version 3 in 'from' has the OLD schema hashes; 'to' has the NEW hashes and version 4.
    const from = loadSnapshot('schema_only_change_in_latest_model_version.json');
    const to = loadSnapshot('new_model_version_after_schema_only_change.json');

    it('should not throw and emit a warning when a schema-only change is present in an existing version alongside a new version', () => {
      expect(() => validateChangesWrapper({ from, to, type: { name: 'task' } })).not.toThrow();
      expect(log).toHaveBeenCalledWith(expect.stringContaining('WARNING'));
      expect(log).toHaveBeenCalledWith(expect.stringContaining("'task'"));
      expect(log).toHaveBeenCalledWith(expect.stringContaining('10.3.0'));
    });

    it('should throw when a structural mutation is present in an existing version alongside a new version', () => {
      // Version 3 has changeTypes mutated (structural change), plus version 4 is new.
      const typeFrom = from.typeDefinitions.task;
      const toWithStructuralMutation = {
        ...to.typeDefinitions.task,
        modelVersions: to.typeDefinitions.task.modelVersions.map((mv) =>
          mv.version === '3' ? { ...mv, changeTypes: ['data_removal'] } : mv
        ),
      };
      const registeredType = {
        name: 'task',
        namespaceType: 'agnostic' as const,
        hidden: false,
        mappings: { dynamic: false as const, properties: {} },
        modelVersions: {},
      };

      expect(() =>
        validateChangesExistingType({
          from: typeFrom,
          to: toWithStructuralMutation,
          registeredType,
          log,
        })
      ).toThrowError(
        `Some modelVersions have been structurally updated for SO type 'task' after they were defined: 10.3.0.`
      );
    });
  });

  it('should throw if model versions are not consecutive integers starting at 1', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('non_consecutive_model_versions.json');

    expect(() => validateChangesWrapper({ from, to, type: { name: 'task' } })).toThrowError(
      `The 'task' SO type is missing model version '7'. Model versions defined: 1,2,3,4,5,6,8`
    );
  });

  it('should throw if mappings are updated without a modelVersion bump', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('mappings_updated_no_bump.json');

    expect(() => validateChangesWrapper({ from, to, type: { name: 'task' } })).toThrowError(
      `The 'task' SO type has changes in the mappings, but is missing a modelVersion that defines these changes.`
    );
  });

  it('should throw if the initial model version defines mapping changes', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('changes_in_initial_version.json');

    expect(() =>
      validateChangesWrapper({ from, to, type: { name: 'usage-counter' } })
    ).toThrowError(
      `The new model version '1' for SO type 'usage-counter' is defining mappings' changes. For backwards-compatibility reasons, the initial model version can only include schema definitions.`
    );
  });

  it('should throw if new mapping fields are not declared in the model version', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('new_mappings_not_in_model_version.json');

    expect(() => validateChangesWrapper({ from, to, type: { name: 'task' } })).toThrowError(
      /The SO type 'task' has new mapping fields that are not declared in model version '7': newUndeclaredField/
    );
  });

  it('should throw if new mapping fields have index: false', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('index_false_in_new_mappings.json');

    expect(() => validateChangesWrapper({ from, to, type: { name: 'task' } })).toThrowError(
      /The SO type 'task' has new mapping fields with 'index: false': fieldWithIndexFalse/
    );
  });

  it('should throw if new mapping fields have enabled: false', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('enabled_false_in_new_mappings.json');

    expect(() => validateChangesWrapper({ from, to, type: { name: 'task' } })).toThrowError(
      /The SO type 'task' has new mapping fields with 'enabled: false': fieldWithEnabledFalse/
    );
  });

  describe('ignore_above validation', () => {
    const sharedModelVersionIgnoreAbove = {
      version: '1',
      modelVersionHash: 'hash',
      changeTypes: [],
      hasTransformation: false,
      newMappings: [],
      schemas: { create: 'hash', forwardCompatibility: 'hash' },
    };

    const buildRecordIgnoreAbove = (
      mappings: Record<string, unknown> = {}
    ): MigrationInfoRecord => ({
      name: 'my-type',
      hash: 'hash',
      migrationVersions: [],
      schemaVersions: [],
      modelVersions: [sharedModelVersionIgnoreAbove],
      mappings,
    });

    const baseRegisteredType: SavedObjectsType = {
      name: 'my-type',
      namespaceType: 'agnostic',
      hidden: false,
      mappings: { dynamic: false, properties: {} },
      modelVersions: {},
    } as unknown as SavedObjectsType;

    it('should warn (not throw) when a keyword field was already missing ignore_above in the baseline', () => {
      const from = buildRecordIgnoreAbove({ 'properties.myField.type': 'keyword' });
      const to = buildRecordIgnoreAbove({ 'properties.myField.type': 'keyword' });

      expect(() =>
        validateChangesExistingType({ from, to, registeredType: baseRegisteredType, log })
      ).not.toThrow();
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining(
          "pre-existing 'keyword' or 'flattened' mapping fields without 'ignore_above'"
        )
      );
      expect(log).toHaveBeenCalledWith(expect.stringContaining('myField'));
    });

    it('should warn (not throw) when a flattened field was already missing ignore_above in the baseline', () => {
      const from = buildRecordIgnoreAbove({ 'properties.dataField.type': 'flattened' });
      const to = buildRecordIgnoreAbove({ 'properties.dataField.type': 'flattened' });

      expect(() =>
        validateChangesExistingType({ from, to, registeredType: baseRegisteredType, log })
      ).not.toThrow();
      expect(log).toHaveBeenCalledWith(expect.stringContaining('dataField'));
    });

    it('should throw when a new keyword field is introduced without ignore_above', () => {
      const from = buildRecordIgnoreAbove({});
      const to = buildRecordIgnoreAbove({ 'properties.newField.type': 'keyword' });

      expect(() =>
        validateChangesExistingType({ from, to, registeredType: baseRegisteredType, log })
      ).toThrowError(
        /The SO type 'my-type' has newly introduced 'keyword' or 'flattened' mapping fields without 'ignore_above': newField/
      );
    });

    it('should throw when a new flattened field is introduced without ignore_above', () => {
      const from = buildRecordIgnoreAbove({});
      const to = buildRecordIgnoreAbove({ 'properties.dataField.type': 'flattened' });

      expect(() =>
        validateChangesExistingType({ from, to, registeredType: baseRegisteredType, log })
      ).toThrowError(
        /The SO type 'my-type' has newly introduced 'keyword' or 'flattened' mapping fields without 'ignore_above': dataField/
      );
    });

    it('should not throw or warn when all keyword fields have ignore_above', () => {
      // Use the same mappings in from and to to avoid triggering the "no model version bump" check.
      const mappings = {
        'properties.myField.type': 'keyword',
        'properties.myField.ignore_above': 1024,
      };
      const from = buildRecordIgnoreAbove(mappings);
      const to = buildRecordIgnoreAbove(mappings);

      expect(() =>
        validateChangesExistingType({ from, to, registeredType: baseRegisteredType, log })
      ).not.toThrow();
      expect(log).not.toHaveBeenCalledWith(expect.stringContaining('ignore_above'));
    });

    it('should warn for pre-existing fields and throw for newly introduced ones in the same type', () => {
      const from = buildRecordIgnoreAbove({ 'properties.oldField.type': 'keyword' });
      const to = buildRecordIgnoreAbove({
        'properties.oldField.type': 'keyword',
        'properties.newField.type': 'keyword',
      });

      expect(() =>
        validateChangesExistingType({ from, to, registeredType: baseRegisteredType, log })
      ).toThrowError(/newField/);
      expect(log).toHaveBeenCalledWith(expect.stringContaining('pre-existing'));
      expect(log).toHaveBeenCalledWith(expect.stringContaining('oldField'));
    });

    it('should throw when a new keyword subfield (multi-field) is introduced without ignore_above', () => {
      const from = buildRecordIgnoreAbove({ 'properties.name.type': 'text' });
      const to = buildRecordIgnoreAbove({
        'properties.name.type': 'text',
        'properties.name.fields.keyword.type': 'keyword',
      });

      expect(() =>
        validateChangesExistingType({ from, to, registeredType: baseRegisteredType, log })
      ).toThrowError(/name\.fields\.keyword/);
    });

    it('should not throw when a keyword field lost ignore_above relative to baseline (treated as newly introduced problem)', () => {
      // A field that had ignore_above in the baseline but lost it is a newly introduced problem,
      // even though the field key existed before.
      const from = buildRecordIgnoreAbove({
        'properties.myField.type': 'keyword',
        'properties.myField.ignore_above': 1024,
      });
      const to = buildRecordIgnoreAbove({ 'properties.myField.type': 'keyword' });

      expect(() =>
        validateChangesExistingType({ from, to, registeredType: baseRegisteredType, log })
      ).toThrowError(
        /The SO type 'my-type' has newly introduced 'keyword' or 'flattened' mapping fields without 'ignore_above': myField/
      );
      expect(log).not.toHaveBeenCalled();
    });
  });

  describe('name/title field type validation', () => {
    const sharedModelVersion = {
      version: '1',
      modelVersionHash: 'hash',
      changeTypes: [],
      hasTransformation: false,
      newMappings: [],
      schemas: { create: false as const, forwardCompatibility: false as const },
    };

    const buildRecord = (mappings: Record<string, unknown> = {}): MigrationInfoRecord => ({
      name: 'my-type',
      hash: 'hash',
      migrationVersions: [],
      schemaVersions: [],
      modelVersions: [sharedModelVersion],
      mappings,
    });

    const importableExportableType: SavedObjectsType = {
      name: 'my-type',
      namespaceType: 'agnostic',
      hidden: false,
      management: { importableAndExportable: true },
      mappings: { dynamic: false, properties: {} },
      modelVersions: {},
    } as unknown as SavedObjectsType;

    it('should warn (not throw) when name or title field was already keyword in a previous model version', () => {
      const from = buildRecord({ 'properties.name.type': 'keyword' });
      const to = buildRecord({ 'properties.name.type': 'keyword' });

      expect(() =>
        validateChangesExistingType({ from, to, registeredType: importableExportableType, log })
      ).not.toThrow();
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining("pre-existing 'name' or 'title' fields with incorrect types")
      );
      expect(log).toHaveBeenCalledWith(expect.stringContaining('name (type: keyword'));
    });

    it('should throw when a name or title field is newly introduced with wrong type', () => {
      const from = buildRecord({});
      const to = buildRecord({ 'properties.name.type': 'keyword' });

      expect(() =>
        validateChangesExistingType({ from, to, registeredType: importableExportableType, log })
      ).toThrowError(
        /The SO type 'my-type' has 'name' or 'title' fields with incorrect types.*name \(type: keyword, expected: text\)/
      );
    });

    it('should warn for pre-existing fields and throw for newly introduced ones in the same type', () => {
      const from = buildRecord({ 'properties.title.type': 'keyword' });
      const to = buildRecord({
        'properties.name.type': 'keyword',
        'properties.title.type': 'keyword',
      });

      expect(() =>
        validateChangesExistingType({ from, to, registeredType: importableExportableType, log })
      ).toThrowError(/name \(type: keyword, expected: text\)/);
      expect(log).toHaveBeenCalledWith(expect.stringContaining('title (type: keyword'));
    });

    it('should throw when a name or title field is downgraded from text to keyword', () => {
      // Downgrading from a valid type (text) to an invalid one (keyword) is a newly introduced
      // problem even though the field key was already present in the baseline.
      const from = buildRecord({ 'properties.name.type': 'text' });
      const to = buildRecord({ 'properties.name.type': 'keyword' });

      expect(() =>
        validateChangesExistingType({ from, to, registeredType: importableExportableType, log })
      ).toThrowError(
        /The SO type 'my-type' has 'name' or 'title' fields with incorrect types.*name \(type: keyword, expected: text\)/
      );
      expect(log).not.toHaveBeenCalled();
    });

    it('should not validate name/title field types for types not searchable via the management page', () => {
      const internalType: SavedObjectsType = {
        name: 'my-type',
        namespaceType: 'agnostic',
        hidden: false,
        management: { importableAndExportable: false },
        mappings: { dynamic: false, properties: {} },
        modelVersions: {},
      } as unknown as SavedObjectsType;
      // Use the same keyword mapping in both from and to so that the model-version check does not
      // fire — we only want to verify that the name/title check is skipped for internal types.
      // Both snapshots have the same keyword field, so it is treated as pre-existing by the
      // ignore_above check, which emits a warning but does not throw.
      const from = buildRecord({ 'properties.name.type': 'keyword' });
      const to = buildRecord({ 'properties.name.type': 'keyword' });

      expect(() =>
        validateChangesExistingType({ from, to, registeredType: internalType, log })
      ).not.toThrow();
      expect(log).not.toHaveBeenCalledWith(
        expect.stringContaining("'name' or 'title' fields with incorrect types")
      );
    });
  });
});
