/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
import { SavedObjectsType, SavedObjectMigrationMap } from '@kbn/core-saved-objects-server';
import { validateMigrationsMapObject, validateMigrationDefinition } from './validate_migrations';

describe('validateMigrationDefinition', () => {
  let typeRegistry: SavedObjectTypeRegistry;

  const defaultKibanaVersion = '3.2.3';
  const defaultConvertVersion = '8.0.0';

  const createType = (parts: Partial<SavedObjectsType>): SavedObjectsType => ({
    name: 'test',
    hidden: false,
    namespaceType: 'single',
    mappings: { properties: {} },
    ...parts,
  });

  const addType = (parts: Partial<SavedObjectsType>) => {
    typeRegistry.registerType(createType(parts));
  };

  const validate = ({
    kibanaVersion = defaultKibanaVersion,
    convertVersion = defaultConvertVersion,
  }: {
    convertVersion?: string;
    kibanaVersion?: string;
  } = {}) => validateMigrationDefinition(typeRegistry, kibanaVersion, convertVersion);

  beforeEach(() => {
    typeRegistry = new SavedObjectTypeRegistry();
  });

  describe('convertToMultiNamespaceTypeVersion', () => {
    it(`validates convertToMultiNamespaceTypeVersion can only be used with namespaceType 'multiple' or 'multiple-isolated'`, () => {
      addType({
        name: 'foo',
        convertToMultiNamespaceTypeVersion: 'bar',
      });
      expect(() => validate()).toThrow(
        `Invalid convertToMultiNamespaceTypeVersion for type foo. Expected namespaceType to be 'multiple' or 'multiple-isolated', but got 'single'.`
      );
    });

    it(`validates convertToMultiNamespaceTypeVersion must be a semver`, () => {
      addType({
        name: 'foo',
        convertToMultiNamespaceTypeVersion: 'bar',
        namespaceType: 'multiple',
      });
      expect(() => validate()).toThrow(
        `Invalid convertToMultiNamespaceTypeVersion for type foo. Expected value to be a semver, but got 'bar'.`
      );
    });

    it('validates convertToMultiNamespaceTypeVersion matches the convertVersion, if specified', () => {
      addType({
        name: 'foo',
        convertToMultiNamespaceTypeVersion: '3.2.4',
        namespaceType: 'multiple',
      });
      expect(() => validate({ convertVersion: '3.2.3', kibanaVersion: '3.2.3' })).toThrowError(
        `Invalid convertToMultiNamespaceTypeVersion for type foo. Value '3.2.4' cannot be any other than '3.2.3'.`
      );
    });

    it('validates convertToMultiNamespaceTypeVersion is not greater than the current Kibana version', () => {
      addType({
        name: 'foo',
        convertToMultiNamespaceTypeVersion: '3.2.4',
        namespaceType: 'multiple',
      });
      expect(() => validateMigrationDefinition(typeRegistry, defaultKibanaVersion)).toThrowError(
        `Invalid convertToMultiNamespaceTypeVersion for type foo. Value '3.2.4' cannot be greater than the current Kibana version '3.2.3'.`
      );
    });

    it('validates convertToMultiNamespaceTypeVersion is not used on a patch version', () => {
      addType({
        name: 'foo',
        convertToMultiNamespaceTypeVersion: '3.1.1',
        namespaceType: 'multiple',
      });
      expect(() => validateMigrationDefinition(typeRegistry, defaultKibanaVersion)).toThrowError(
        `Invalid convertToMultiNamespaceTypeVersion for type foo. Value '3.1.1' cannot be used on a patch version (must be like 'x.y.0').`
      );
    });
  });
});

describe('validateMigrationsMapObject', () => {
  const kibanaVersion = '3.2.3';

  const validate = (migrations: SavedObjectMigrationMap) =>
    validateMigrationsMapObject('foo', kibanaVersion, migrations);

  it('validates individual migrations are valid semvers', () => {
    const invalidMap = {
      bar: jest.fn(),
      '1.2.3': jest.fn(),
    };

    expect(() => validate(invalidMap)).toThrow(/Expected all properties to be semvers/i);
  });

  it('validates individual migrations are not greater than the current Kibana version', () => {
    const withGreaterVersion = {
      '3.2.4': (doc: any) => doc,
    };

    expect(() => validate(withGreaterVersion)).toThrowError(
      `Invalid migration for type foo. Property '3.2.4' cannot be greater than the current Kibana version '3.2.3'.`
    );
  });

  it('validates the migration function', () => {
    const invalidVersionFunction = { '1.2.3': 23 as any };

    expect(() => validate(invalidVersionFunction)).toThrow(/expected a function, but got 23/i);
  });
  it('validates definitions with migrations: Function | Objects', () => {
    const validMigrationMap = {
      '1.2.3': jest.fn(),
    };

    expect(() => validate(validMigrationMap)).not.toThrow();
  });
});
