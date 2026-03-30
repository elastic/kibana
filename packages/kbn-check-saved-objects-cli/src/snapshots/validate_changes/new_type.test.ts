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
import { validateChangesNewType } from './new_type';
import type { MigrationInfoRecord, MigrationSnapshot, ModelVersionSummary } from '../../types';

function loadSnapshot(filename: string): MigrationSnapshot {
  const filePath = path.join(__dirname, '..', 'mocks', filename);
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

function buildModelVersion(overrides: Partial<ModelVersionSummary> = {}): ModelVersionSummary {
  return {
    version: '1',
    modelVersionHash: 'hash',
    changeTypes: [],
    hasTransformation: false,
    newMappings: [],
    schemas: { create: 'hash', forwardCompatibility: 'hash' },
    ...overrides,
  };
}

function buildNewType(
  name: string,
  overrides: Partial<MigrationInfoRecord> = {}
): MigrationInfoRecord {
  return {
    name,
    hash: 'hash',
    migrationVersions: [],
    schemaVersions: [],
    modelVersions: [buildModelVersion()],
    mappings: {},
    ...overrides,
  };
}

describe('validateChangesNewType', () => {
  beforeEach(() => jest.clearAllMocks());

  const callValidate = (
    to: MigrationInfoRecord,
    registeredType: SavedObjectsType = createMockType(to.name, [])
  ) => validateChangesNewType({ to, registeredType });

  const validateNewTypeWrapper = ({
    to,
    name,
    schemaFields,
  }: {
    to: MigrationSnapshot;
    name: string;
    schemaFields: string[];
  }) =>
    validateChangesNewType({
      to: to.typeDefinitions[name],
      registeredType: createMockType(name, schemaFields),
    });

  it('should throw if the new type defines legacy migrations', () => {
    const to = buildNewType('my-type', { migrationVersions: ['7.14.0'] });

    expect(() => callValidate(to)).toThrowError(
      `❌ New SO type my-type cannot define legacy 'migrations'.`
    );
  });

  it('should throw if no model versions are defined', () => {
    const to = buildNewType('my-type', { modelVersions: [] });

    expect(() => callValidate(to)).toThrowError(
      `❌ New SO type my-type must define the first model version '1'.`
    );
  });

  it('should throw if the initial model version defines mapping changes', () => {
    const snapshot = loadSnapshot('changes_in_initial_version.json');

    expect(() => callValidate(snapshot.typeDefinitions['usage-counter'])).toThrowError(
      `❌ The new model version '1' for SO type 'usage-counter' is defining mappings' changes. For backwards-compatibility reasons, the initial model version can only include schema definitions.`
    );
  });

  it('should throw if model versions are not consecutive integers starting at 1', () => {
    const to = buildNewType('my-type', {
      modelVersions: [buildModelVersion({ version: '1' }), buildModelVersion({ version: '3' })],
    });

    expect(() => callValidate(to)).toThrowError(
      `❌ The 'my-type' SO type is missing model version '2'. Model versions defined: 1,3`
    );
  });

  it('should throw if the latest model version is missing the forwardCompatibility schema', () => {
    const to = buildNewType('my-type', {
      modelVersions: [
        buildModelVersion({ schemas: { create: 'hash', forwardCompatibility: false } }),
      ],
    });

    expect(() => callValidate(to)).toThrowError(
      `❌ The new model version '1' for SO type 'my-type' is missing the 'forwardCompatibility' schema definition.`
    );
  });

  it('should throw if the latest model version is missing the create schema', () => {
    const to = buildNewType('my-type', {
      modelVersions: [
        buildModelVersion({ schemas: { create: false, forwardCompatibility: 'hash' } }),
      ],
    });

    expect(() => callValidate(to)).toThrowError(
      `❌ The new model version '1' for SO type 'my-type' is missing the 'create' schema definition.`
    );
  });

  it('should throw if mapping fields are not present in the latest model version schema', () => {
    const snapshot = loadSnapshot('mapping_fields_not_declared.json');

    expect(() =>
      validateNewTypeWrapper({
        to: snapshot,
        name: 'new-type-with-undeclared-fields',
        schemaFields: ['declaredField'],
      })
    ).toThrowError(
      /The SO type 'new-type-with-undeclared-fields' has mapping fields not present in the latest model version schema: undeclaredField/
    );
  });

  it('should throw if mapping fields have index: false', () => {
    const to = buildNewType('my-type', {
      mappings: {
        'properties.myField.type': 'keyword',
        'properties.myField.index': false,
      },
    });

    expect(() => callValidate(to, createMockType('my-type', ['myField']))).toThrowError(
      /The SO type 'my-type' has new mapping fields with 'index: false': myField/
    );
  });

  it('should throw if mapping fields have enabled: false', () => {
    const to = buildNewType('my-type', {
      mappings: {
        'properties.myField.type': 'object',
        'properties.myField.enabled': false,
      },
    });

    expect(() => callValidate(to, createMockType('my-type', ['myField']))).toThrowError(
      /The SO type 'my-type' has new mapping fields with 'enabled: false': myField/
    );
  });

  it('should throw if a top-level mapping field has enabled: false (type:object pattern)', () => {
    const to = buildNewType('my-type', {
      mappings: {
        'properties.state_transition.type': 'object',
        'properties.state_transition.enabled': false,
      },
    });

    expect(() => callValidate(to, createMockType('my-type', ['state_transition']))).toThrowError(
      /The SO type 'my-type' has new mapping fields with 'enabled: false': state_transition/
    );
  });

  it('should throw if a nested mapping field has enabled: false', () => {
    const to = buildNewType('my-type', {
      mappings: {
        'properties.parent.properties.child.type': 'object',
        'properties.parent.properties.child.enabled': false,
      },
    });

    expect(() => callValidate(to, createMockType('my-type', ['parent.child']))).toThrowError(
      /The SO type 'my-type' has new mapping fields with 'enabled: false': parent.child/
    );
  });

  it('should throw if name or title fields have wrong type', () => {
    const snapshot = loadSnapshot('name_title_wrong_type.json');

    expect(() =>
      validateNewTypeWrapper({
        to: snapshot,
        name: 'type-with-wrong-name-title',
        schemaFields: ['name', 'title'],
      })
    ).toThrowError(
      /The SO type 'type-with-wrong-name-title' has 'name' or 'title' fields with incorrect types.*name \(type: keyword, expected: text\).*title \(type: keyword, expected: text\)/
    );
  });

  it('should not throw when name and title fields are of type text', () => {
    const to = buildNewType('my-type', {
      mappings: {
        'properties.name.type': 'text',
        'properties.title.type': 'text',
      },
    });

    expect(() => callValidate(to, createMockType('my-type', ['name', 'title']))).not.toThrow();
  });

  it('should not throw when name has a keyword subfield for sortability', () => {
    const to = buildNewType('my-type', {
      mappings: {
        'properties.name.type': 'text',
        'properties.name.fields.keyword.type': 'keyword',
        'properties.name.fields.keyword.ignore_above': 2048,
      },
    });

    expect(() => callValidate(to, createMockType('my-type', ['name']))).not.toThrow();
  });

  it('should not throw when mapping has nested fields that match schema (path format normalization)', () => {
    const snapshot = loadSnapshot('nested_mapping_fields.json');

    expect(() =>
      validateNewTypeWrapper({
        to: snapshot,
        name: 'type-with-nested-fields',
        schemaFields: ['topLevel', 'parent.child'],
      })
    ).not.toThrow();
  });

  it('should throw when a mapping field has enabled: false even when schema uses arrayOf(object(...))', () => {
    const to = buildNewType('my-type', {
      mappings: {
        'properties.artifacts.type': 'object',
        'properties.artifacts.enabled': false,
      },
    });

    const registeredType = {
      name: 'my-type',
      namespaceType: 'agnostic',
      hidden: false,
      mappings: { dynamic: false, properties: {} },
      modelVersions: {
        1: {
          changes: [],
          schemas: {
            create: schema.object({
              artifacts: schema.maybe(
                schema.arrayOf(schema.object({ id: schema.string(), type: schema.string() }))
              ),
            }),
            forwardCompatibility: schema.object(
              {
                artifacts: schema.maybe(
                  schema.arrayOf(schema.object({ id: schema.string(), type: schema.string() }))
                ),
              },
              { unknowns: 'ignore' }
            ),
          },
        },
      },
    } as unknown as SavedObjectsType;

    expect(() => callValidate(to, registeredType)).toThrowError(
      /The SO type 'my-type' has new mapping fields with 'enabled: false': artifacts/
    );
  });

  it('should throw when a mapping field is not declared in the arrayOf(object(...)) item schema', () => {
    const to = buildNewType('my-array-type', {
      mappings: {
        'properties.destinations.properties.id.type': 'keyword',
        'properties.destinations.properties.foo.type': 'keyword',
      },
    });

    const registeredType = {
      name: 'my-array-type',
      namespaceType: 'agnostic',
      hidden: false,
      mappings: { dynamic: false, properties: {} },
      modelVersions: {
        1: {
          changes: [],
          schemas: {
            create: schema.object({
              destinations: schema.arrayOf(schema.object({ id: schema.string() })),
            }),
            forwardCompatibility: schema.object(
              { destinations: schema.arrayOf(schema.object({ id: schema.string() })) },
              { unknowns: 'ignore' }
            ),
          },
        },
      },
    } as unknown as SavedObjectsType;

    expect(() => callValidate(to, registeredType)).toThrowError(
      /The SO type 'my-array-type' has mapping fields not present in the latest model version schema: destinations.foo/
    );
  });

  it('should not throw when mapping has array-of-object sub-fields covered by arrayOf(object(...))', () => {
    const to = buildNewType('my-array-type', {
      mappings: {
        'properties.destinations.properties.id.type': 'keyword',
        'properties.destinations.properties.type.type': 'keyword',
      },
    });

    const registeredType = {
      name: 'my-array-type',
      namespaceType: 'agnostic',
      hidden: false,
      mappings: { dynamic: false, properties: {} },
      modelVersions: {
        1: {
          changes: [],
          schemas: {
            create: schema.object({
              destinations: schema.arrayOf(
                schema.object({ id: schema.string(), type: schema.string() })
              ),
            }),
            forwardCompatibility: schema.object(
              {
                destinations: schema.arrayOf(
                  schema.object({ id: schema.string(), type: schema.string() })
                ),
              },
              { unknowns: 'ignore' }
            ),
          },
        },
      },
    } as unknown as SavedObjectsType;

    expect(() => callValidate(to, registeredType)).not.toThrow();
  });
});
