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
      `❌ Modifications have been detected in the 'config.migrations'. This property is deprected and no modifications are allowed.`
    );
  });

  it('should throw if new migrations are added', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('migrations_added.json');

    expect(() => validateChangesWrapper({ from, to, type: { name: 'config' } })).toThrowError(
      `❌ Modifications have been detected in the 'config.migrations'. This property is deprected and no modifications are allowed.`
    );
  });

  it('should throw if modelVersions are deleted', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('model_versions_deleted.json');

    expect(() => validateChangesWrapper({ from, to, type: { name: 'task' } })).toThrowError(
      `❌ Some model versions have been deleted for SO type 'task'.`
    );
  });

  it('should throw if more than one new model version is defined', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('two_new_model_versions.json');
    expect(() => validateChangesWrapper({ from, to, type: { name: 'task' } })).toThrowError(
      `❌ The SO type 'task' is defining 2 new model versions, but can only define one at a time.`
    );
  });

  it('should throw if existing model versions are mutated', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('mutated_model_versions.json');

    expect(() => validateChangesWrapper({ from, to, type: { name: 'task' } })).toThrowError(
      `❌ Some modelVersions have been updated for SO type 'task' after they were defined: 10.6.0.`
    );
  });

  describe('schema-only changes in the latest model version', () => {
    it('should not throw and emit a warning when only the latest model version schemas changed and mappings are unchanged', () => {
      const from = loadSnapshot('schema_only_change_in_latest_model_version.json');
      const to = loadSnapshot('schema_only_change_in_latest_model_version_updated.json');

      expect(() => validateChangesWrapper({ from, to, type: { name: 'task' } })).not.toThrow();
      expect(log).toHaveBeenCalledWith(expect.stringContaining('WARNING'));
      expect(log).toHaveBeenCalledWith(expect.stringContaining("'task'"));
    });

    it('should throw when a schema change is detected in an older (non-latest) model version', () => {
      const from = loadSnapshot('schema_only_change_in_latest_model_version.json');
      const to = loadSnapshot('schema_only_change_in_older_model_version.json');

      expect(() => validateChangesWrapper({ from, to, type: { name: 'task' } })).toThrowError(
        `❌ Some modelVersions have been updated for SO type 'task' after they were defined`
      );
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

  it('should throw if model versions are not consecutive integers starting at 1', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('non_consecutive_model_versions.json');

    expect(() => validateChangesWrapper({ from, to, type: { name: 'task' } })).toThrowError(
      `❌ The 'task' SO type is missing model version '7'. Model versions defined: 1,2,3,4,5,6,8`
    );
  });

  it('should throw if mappings are updated without a modelVersion bump', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('mappings_updated_no_bump.json');

    expect(() => validateChangesWrapper({ from, to, type: { name: 'task' } })).toThrowError(
      `❌ The 'task' SO type has changes in the mappings, but is missing a modelVersion that defines these changes.`
    );
  });

  it('should throw if the initial model version defines mapping changes', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('changes_in_initial_version.json');

    expect(() =>
      validateChangesWrapper({ from, to, type: { name: 'usage-counter' } })
    ).toThrowError(
      `❌ The new model version '1' for SO type 'usage-counter' is defining mappings' changes. For backwards-compatibility reasons, the initial model version can only include schema definitions.`
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

  describe('name/title field type validation', () => {
    const sharedModelVersion = {
      version: '1',
      modelVersionHash: 'hash',
      changeTypes: [],
      hasTransformation: false,
      newMappings: [],
      schemas: { create: 'hash', forwardCompatibility: 'hash' },
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

    it('should not validate types not searchable via the management page', () => {
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
      const from = buildRecord({ 'properties.name.type': 'keyword' });
      const to = buildRecord({ 'properties.name.type': 'keyword' });

      expect(() =>
        validateChangesExistingType({ from, to, registeredType: internalType, log })
      ).not.toThrow();
      expect(log).not.toHaveBeenCalled();
    });
  });
});
