/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { validateChangesExistingType, validateChangesNewType } from './validate_changes';
import type { MigrationSnapshot } from '../types';
import path from 'path';
import fs from 'fs';

function loadSnapshot(filename: string): MigrationSnapshot {
  const filePath = path.join(__dirname, 'mocks', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function createMockType(name: string, schemaFields: string[]): SavedObjectsType {
  const fields = Object.fromEntries(schemaFields.map((f) => [f, schema.string()]));
  return {
    name,
    namespaceType: 'agnostic',
    hidden: false,
    mappings: { dynamic: false, properties: {} },
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          create: schema.object(fields),
          forwardCompatibility: schema.object(fields, { unknowns: 'ignore' }),
        },
      },
    },
  } as unknown as SavedObjectsType;
}

describe('validateChangesExistingType', () => {
  beforeEach(() => jest.clearAllMocks());

  const validateChangesWrapper = ({
    from,
    to,
    name,
  }: {
    from: MigrationSnapshot;
    to: MigrationSnapshot;
    name: string;
  }) => {
    const typeFrom = from.typeDefinitions[name];
    const typeTo = to.typeDefinitions[name];
    return validateChangesExistingType({ from: typeFrom, to: typeTo });
  };

  it('should throw if migrations are deleted', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('migrations_deleted.json');

    expect(() => validateChangesWrapper({ from, to, name: 'config' })).toThrowError(
      `❌ Modifications have been detected in the 'config.migrations'. This property is deprected and no modifications are allowed.`
    );
  });

  it('should throw if new migrations are added', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('migrations_added.json');

    expect(() => validateChangesWrapper({ from, to, name: 'config' })).toThrowError(
      `❌ Modifications have been detected in the 'config.migrations'. This property is deprected and no modifications are allowed.`
    );
  });

  it('should throw if modelVersions are deleted', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('model_versions_deleted.json');

    expect(() => validateChangesWrapper({ from, to, name: 'task' })).toThrowError(
      `❌ Some model versions have been deleted for SO type 'task'.`
    );
  });

  it('should throw if more than one new model version is defined', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('two_new_model_versions.json');
    expect(() => validateChangesWrapper({ from, to, name: 'task' })).toThrowError(
      `❌ The SO type 'task' is defining two (or more) new model versions.`
    );
  });

  it('should throw if existing model versions are mutated', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('mutated_model_versions.json');

    expect(() => validateChangesWrapper({ from, to, name: 'task' })).toThrowError(
      `❌ Some modelVersions have been updated for SO type 'task' after they were defined: 10.6.0.`
    );
  });

  it('should throw if model versions are not consecutive integers starting at 1', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('non_consecutive_model_versions.json');

    expect(() => validateChangesWrapper({ from, to, name: 'task' })).toThrowError(
      `❌ The 'task' SO type is missing model version '7'. Model versions defined: 1,2,3,4,5,6,8`
    );
  });

  it('should throw if mappings are updated without a modelVersion bump', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('mappings_updated_no_bump.json');

    expect(() => validateChangesWrapper({ from, to, name: 'task' })).toThrowError(
      `❌ The 'task' SO type has changes in the mappings, but is missing a modelVersion that defines these changes.`
    );
  });

  it('should throw if the initial model version defines mapping changes', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('changes_in_initial_version.json');

    expect(() => validateChangesWrapper({ from, to, name: 'usage-counter' })).toThrowError(
      `❌ The new model version '1' for SO type 'usage-counter' is defining mappings' changes. For backwards-compatibility reasons, the initial model version can only include schema definitions.`
    );
  });

  it('should throw if new mapping fields are not declared in the model version', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('new_mappings_not_in_model_version.json');

    expect(() => validateChangesWrapper({ from, to, name: 'task' })).toThrowError(
      /The SO type 'task' has new mapping fields that are not declared in model version '7': newUndeclaredField/
    );
  });

  it('should throw if new mapping fields have index: false', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('index_false_in_new_mappings.json');

    expect(() => validateChangesWrapper({ from, to, name: 'task' })).toThrowError(
      /The SO type 'task' has new mapping fields with 'index: false': fieldWithIndexFalse/
    );
  });

  it('should throw if new mapping fields have enabled: false', () => {
    const from = loadSnapshot('baseline.json');
    const to = loadSnapshot('enabled_false_in_new_mappings.json');

    expect(() => validateChangesWrapper({ from, to, name: 'task' })).toThrowError(
      /The SO type 'task' has new mapping fields with 'enabled: false': fieldWithEnabledFalse/
    );
  });

  it('should throw if name or title fields have wrong type', () => {
    const to = loadSnapshot('name_title_wrong_type.json');

    expect(() =>
      validateChangesNewType({
        to: to.typeDefinitions['type-with-wrong-name-title'],
        registeredType: createMockType('type-with-wrong-name-title', ['name', 'title']),
      })
    ).toThrowError(
      /The SO type 'type-with-wrong-name-title' has 'name' or 'title' fields with incorrect types.*name \(type: keyword, expected: text\).*title \(type: keyword, expected: text\)/
    );
  });
});

describe('validateChangesNewType', () => {
  beforeEach(() => jest.clearAllMocks());

  const validateNewTypeWrapper = ({
    to,
    name,
    schemaFields,
  }: {
    to: MigrationSnapshot;
    name: string;
    schemaFields: string[];
  }) => {
    return validateChangesNewType({
      to: to.typeDefinitions[name],
      registeredType: createMockType(name, schemaFields),
    });
  };

  it('should throw if mapping fields are not present in the latest model version schema', () => {
    const to = loadSnapshot('mapping_fields_not_declared.json');

    expect(() =>
      validateNewTypeWrapper({
        to,
        name: 'new-type-with-undeclared-fields',
        schemaFields: ['declaredField'],
      })
    ).toThrowError(
      /The SO type 'new-type-with-undeclared-fields' has mapping fields not present in the latest model version schema: undeclaredField/
    );
  });

  it('should throw if name or title fields have wrong type for new types', () => {
    const to = loadSnapshot('name_title_wrong_type.json');

    expect(() =>
      validateNewTypeWrapper({
        to,
        name: 'type-with-wrong-name-title',
        schemaFields: ['name', 'title'],
      })
    ).toThrowError(
      /The SO type 'type-with-wrong-name-title' has 'name' or 'title' fields with incorrect types.*name \(type: keyword, expected: text\).*title \(type: keyword, expected: text\)/
    );
  });

  it('should not throw when mapping has nested fields that match schema (path format normalization)', () => {
    const to = loadSnapshot('nested_mapping_fields.json');

    expect(() =>
      validateNewTypeWrapper({
        to,
        name: 'type-with-nested-fields',
        schemaFields: ['topLevel', 'parent.child'],
      })
    ).not.toThrow();
  });
});
