/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { validateTypeMigrations } from './validate_migrations';

describe('validateTypeMigrations', () => {
  const defaultKibanaVersion = '3.2.3';
  const defaultConvertVersion = '8.0.0';

  const createType = (parts: Partial<SavedObjectsType>): SavedObjectsType => ({
    name: 'test',
    hidden: false,
    namespaceType: 'single',
    mappings: { properties: {} },
    ...parts,
  });

  const validate = ({
    type,
    kibanaVersion = defaultKibanaVersion,
    convertVersion = defaultConvertVersion,
  }: {
    type: SavedObjectsType;
    convertVersion?: string;
    kibanaVersion?: string;
  }) => validateTypeMigrations({ type, kibanaVersion, convertVersion });

  describe('migrations', () => {
    it('validates individual migrations are valid semvers', () => {
      const type = createType({
        name: 'foo',
        convertToMultiNamespaceTypeVersion: '3.1.1',
        namespaceType: 'multiple',
        migrations: {
          bar: jest.fn(),
          '1.2.3': jest.fn(),
        },
      });

      expect(() => validate({ type })).toThrow(/Expected all properties to be semvers/i);
    });

    it('validates individual migrations are not greater than the current Kibana version', () => {
      const type = createType({
        name: 'foo',
        convertToMultiNamespaceTypeVersion: '3.1.1',
        namespaceType: 'multiple',
        migrations: {
          '3.2.4': (doc) => doc,
        },
      });

      expect(() => validate({ type })).toThrowError(
        `Invalid migration for type foo. Property '3.2.4' cannot be greater than the current Kibana version '3.2.3'.`
      );
    });

    it('validates the migration function', () => {
      const type = createType({
        name: 'foo',
        convertToMultiNamespaceTypeVersion: '3.1.1',
        namespaceType: 'multiple',
        migrations: { '1.2.3': 23 as any },
      });

      expect(() => validate({ type })).toThrow(/expected a function, but got 23/i);
    });
  });

  describe('convertToMultiNamespaceTypeVersion', () => {
    it(`validates convertToMultiNamespaceTypeVersion can only be used with namespaceType 'multiple' or 'multiple-isolated'`, () => {
      const type = createType({
        name: 'foo',
        convertToMultiNamespaceTypeVersion: 'bar',
      });
      expect(() => validate({ type })).toThrow(
        `Invalid convertToMultiNamespaceTypeVersion for type foo. Expected namespaceType to be 'multiple' or 'multiple-isolated', but got 'single'.`
      );
    });

    it(`validates convertToMultiNamespaceTypeVersion must be a semver`, () => {
      const type = createType({
        name: 'foo',
        convertToMultiNamespaceTypeVersion: 'bar',
        namespaceType: 'multiple',
      });
      expect(() => validate({ type })).toThrow(
        `Invalid convertToMultiNamespaceTypeVersion for type foo. Expected value to be a semver, but got 'bar'.`
      );
    });

    it('validates convertToMultiNamespaceTypeVersion matches the convertVersion, if specified', () => {
      const type = createType({
        name: 'foo',
        convertToMultiNamespaceTypeVersion: '3.2.4',
        namespaceType: 'multiple',
      });
      expect(() =>
        validate({ type, convertVersion: '3.2.3', kibanaVersion: '3.2.3' })
      ).toThrowError(
        `Invalid convertToMultiNamespaceTypeVersion for type foo. Value '3.2.4' cannot be any other than '3.2.3'.`
      );
    });

    it('validates convertToMultiNamespaceTypeVersion is not greater than the current Kibana version', () => {
      const type = createType({
        name: 'foo',
        convertToMultiNamespaceTypeVersion: '3.2.4',
        namespaceType: 'multiple',
      });
      expect(() =>
        validateTypeMigrations({ type, kibanaVersion: defaultKibanaVersion })
      ).toThrowError(
        `Invalid convertToMultiNamespaceTypeVersion for type foo. Value '3.2.4' cannot be greater than the current Kibana version '3.2.3'.`
      );
    });

    it('validates convertToMultiNamespaceTypeVersion is not used on a patch version', () => {
      const type = createType({
        name: 'foo',
        convertToMultiNamespaceTypeVersion: '3.1.1',
        namespaceType: 'multiple',
      });
      expect(() =>
        validateTypeMigrations({ type, kibanaVersion: defaultKibanaVersion })
      ).toThrowError(
        `Invalid convertToMultiNamespaceTypeVersion for type foo. Value '3.1.1' cannot be used on a patch version (must be like 'x.y.0').`
      );
    });
  });
});
