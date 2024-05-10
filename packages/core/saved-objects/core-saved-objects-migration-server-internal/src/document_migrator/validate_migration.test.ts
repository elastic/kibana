/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsType, SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { validateTypeMigrations } from './validate_migrations';

describe('validateTypeMigrations', () => {
  const defaultKibanaVersion = '3.2.3';
  const defaultConvertVersion = '8.0.0';

  const someModelVersion: SavedObjectsModelVersion = {
    changes: [
      {
        type: 'data_backfill',
        backfillFn: jest.fn().mockReturnValue({ attributes: {} }),
      },
    ],
  };

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
        schemas: {
          '1.2.3': schema.object({ bar: schema.string() }),
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

    it('throws on the invalid migration type', () => {
      const type = createType({
        name: 'foo',
        migrations: { '1.2.3': 23 as any },
      });

      expect(() => validate({ type })).toThrow(/expected a function or an object/i);
    });

    it('throws on the invalid migration object', () => {
      const type = createType({
        name: 'foo',
        migrations: {
          '1.2.3': {
            deferred: false,
            transform: 23 as any,
          },
        },
      });

      expect(() => validate({ type })).toThrow(/expected a function or an object/i);
    });

    it('validates the migration object', () => {
      const type = createType({
        name: 'foo',
        migrations: {
          '1.2.3': {
            deferred: false,
            transform: jest.fn(),
          },
        },
      });

      expect(() => validate({ type })).not.toThrow();
    });

    describe('when switchToModelVersionAt is specified', () => {
      it('throws if a migration is specified for a version superior to switchToModelVersionAt', () => {
        const type = createType({
          name: 'foo',
          switchToModelVersionAt: '8.9.0',
          migrations: {
            '8.10.0': jest.fn(),
          },
        });

        expect(() =>
          validate({ type, kibanaVersion: '8.10.0' })
        ).toThrowErrorMatchingInlineSnapshot(
          `"Migration for type foo for version 8.10.0 registered after switchToModelVersionAt (8.9.0)"`
        );
      });

      it('throws if a schema is specified for a version superior to switchToModelVersionAt', () => {
        const type = createType({
          name: 'foo',
          switchToModelVersionAt: '8.9.0',
          schemas: {
            '8.10.0': schema.object({ name: schema.string() }),
          },
        });

        expect(() =>
          validate({ type, kibanaVersion: '8.10.0' })
        ).toThrowErrorMatchingInlineSnapshot(
          `"Schema for type foo for version 8.10.0 registered after switchToModelVersionAt (8.9.0)"`
        );
      });

      it('throws if a migration is specified for a version equal to switchToModelVersionAt', () => {
        const type = createType({
          name: 'foo',
          switchToModelVersionAt: '8.9.0',
          migrations: {
            '8.9.0': jest.fn(),
          },
        });

        expect(() =>
          validate({ type, kibanaVersion: '8.10.0' })
        ).toThrowErrorMatchingInlineSnapshot(
          `"Migration for type foo for version 8.9.0 registered after switchToModelVersionAt (8.9.0)"`
        );
      });

      it('throws if a schema is specified for a version equal to switchToModelVersionAt', () => {
        const type = createType({
          name: 'foo',
          switchToModelVersionAt: '8.9.0',
          schemas: {
            '8.9.0': schema.object({ name: schema.string() }),
          },
        });

        expect(() =>
          validate({ type, kibanaVersion: '8.10.0' })
        ).toThrowErrorMatchingInlineSnapshot(
          `"Schema for type foo for version 8.9.0 registered after switchToModelVersionAt (8.9.0)"`
        );
      });

      it('does not throw if a migration is specified for a version inferior to switchToModelVersionAt', () => {
        const type = createType({
          name: 'foo',
          switchToModelVersionAt: '8.9.0',
          migrations: {
            '8.7.0': jest.fn(),
          },
        });

        expect(() => validate({ type, kibanaVersion: '8.10.0' })).not.toThrow();
      });

      it('does not throw if a schema is specified for a version inferior to switchToModelVersionAt', () => {
        const type = createType({
          name: 'foo',
          switchToModelVersionAt: '8.9.0',
          schemas: {
            '8.7.0': schema.object({ name: schema.string() }),
          },
        });

        expect(() => validate({ type, kibanaVersion: '8.10.0' })).not.toThrow();
      });
    });
  });

  describe('switchToModelVersionAt', () => {
    it('throws if the specified version is not a valid semver', () => {
      const type = createType({
        name: 'foo',
        switchToModelVersionAt: 'foo',
      });

      expect(() => validate({ type })).toThrowErrorMatchingInlineSnapshot(
        `"Type foo: invalid version specified for switchToModelVersionAt: foo"`
      );
    });

    it('throws if the specified version defines a patch version > 0', () => {
      const type = createType({
        name: 'foo',
        switchToModelVersionAt: '8.9.3',
      });

      expect(() => validate({ type })).toThrowErrorMatchingInlineSnapshot(
        `"Type foo: can't use a patch version for switchToModelVersionAt"`
      );
    });
  });

  describe('modelVersions', () => {
    it('throws if used without specifying switchToModelVersionAt', () => {
      const type = createType({
        name: 'foo',
        modelVersions: {
          '1': someModelVersion,
        },
      });

      expect(() => validate({ type, kibanaVersion: '3.2.3' })).toThrowErrorMatchingInlineSnapshot(
        `"Type foo: Using modelVersions requires to specify switchToModelVersionAt"`
      );
    });

    it('throws if the version number is invalid', () => {
      const type = createType({
        name: 'foo',
        switchToModelVersionAt: '3.1.0',
        modelVersions: {
          '1.1': someModelVersion,
        },
      });

      expect(() => validate({ type, kibanaVersion: '3.2.3' })).toThrowErrorMatchingInlineSnapshot(
        `"Model version must be an integer"`
      );
    });

    it('throws when starting with a version higher than 1', () => {
      const type = createType({
        name: 'foo',
        switchToModelVersionAt: '3.1.0',
        modelVersions: {
          '2': someModelVersion,
        },
      });

      expect(() => validate({ type, kibanaVersion: '3.2.3' })).toThrowErrorMatchingInlineSnapshot(
        `"Type foo: model versioning must start with version 1"`
      );
    });

    it('throws when there is a gap in versions', () => {
      const type = createType({
        name: 'foo',
        switchToModelVersionAt: '3.1.0',
        modelVersions: {
          '1': someModelVersion,
          '3': someModelVersion,
          '6': someModelVersion,
        },
      });

      expect(() => validate({ type, kibanaVersion: '3.2.3' })).toThrowErrorMatchingInlineSnapshot(
        `"Type foo: gaps between model versions aren't allowed (missing versions: 2,4,5)"`
      );
    });

    it('does not throw passing an empty model version map', () => {
      const type = createType({
        name: 'foo',
        modelVersions: {},
      });

      expect(() => validate({ type, kibanaVersion: '3.2.3' })).not.toThrow();
    });
  });

  describe('modelVersions with schemas', () => {
    const baseSchema = schema.object({ name: schema.string() }, { unknowns: 'ignore' });

    it('throws if used without specifying switchToModelVersionAt', () => {
      const type = createType({
        name: 'foo',
        modelVersions: {
          1: {
            changes: [],
            schemas: {
              forwardCompatibility: baseSchema,
              create: baseSchema,
            },
          },
        },
        mappings: {
          properties: {
            name: { type: 'text' },
          },
        },
      });

      expect(() => validate({ type, kibanaVersion: '3.2.3' })).toThrowErrorMatchingInlineSnapshot(
        `"Type foo: Using modelVersions requires to specify switchToModelVersionAt"`
      );
    });

    it('does not throw passing a model version schema map', () => {
      const someModelVersionWithSchema = {
        changes: [],
        schemas: {
          forwardCompatibility: baseSchema.extends({}, { unknowns: 'ignore' }),
          create: baseSchema,
        },
      };
      const type = createType({
        name: 'foo',
        switchToModelVersionAt: '3.1.0',
        modelVersions: {
          '1': someModelVersionWithSchema,
        },
        mappings: {
          properties: {
            name: { type: 'text' },
          },
        },
      });

      expect(() => validate({ type, kibanaVersion: '3.2.3' })).not.toThrow();
    });

    it('does not throw passing an empty model version schema map', () => {
      const someModelVersionWithSchema = { changes: [], schemas: {} };
      const type = createType({
        name: 'foo',
        switchToModelVersionAt: '3.1.0',
        modelVersions: {
          '1': someModelVersionWithSchema,
        },
      });

      expect(() => validate({ type, kibanaVersion: '3.2.3' })).not.toThrow();
    });
  });

  describe('modelVersions mapping additions', () => {
    it('throws when registering mapping additions not present in the global mappings', () => {
      const type = createType({
        name: 'foo',
        switchToModelVersionAt: '8.8.0',
        modelVersions: {
          '1': {
            changes: [
              {
                type: 'mappings_addition',
                addedMappings: {
                  field2: { type: 'text' },
                },
              },
            ],
          },
        },
        mappings: {
          properties: {
            field1: { type: 'text' },
          },
        },
      });

      expect(() => validate({ type, kibanaVersion: '3.2.3' })).toThrowErrorMatchingInlineSnapshot(
        `"Type foo: mappings added on model versions not present on the global mappings definition: field2.type"`
      );
    });

    it('does not throw when registering mapping additions are present in the global mappings with a schema', () => {
      const type = createType({
        name: 'foo',
        switchToModelVersionAt: '8.8.0',
        modelVersions: {
          '1': {
            changes: [
              {
                type: 'mappings_addition',
                addedMappings: {
                  field2: { type: 'text' },
                },
              },
            ],
            schemas: {},
          },
          '2': {
            changes: [
              {
                type: 'mappings_addition',
                addedMappings: {
                  field3: { type: 'text' },
                },
              },
            ],
          },
        },
        mappings: {
          properties: {
            field1: { type: 'text' },
            field2: { type: 'text' },
            field3: { type: 'text' },
          },
        },
      });

      expect(() => validate({ type, kibanaVersion: '3.2.3' })).not.toThrow();
    });

    it('throws when registering mapping additions different than the global mappings', () => {
      const type = createType({
        name: 'foo',
        switchToModelVersionAt: '8.8.0',
        modelVersions: {
          '1': {
            changes: [
              {
                type: 'mappings_addition',
                addedMappings: {
                  field2: { type: 'boolean' },
                },
              },
            ],
          },
        },
        mappings: {
          properties: {
            field1: { type: 'text' },
            field2: { type: 'text' },
          },
        },
      });

      expect(() => validate({ type, kibanaVersion: '3.2.3' })).toThrowErrorMatchingInlineSnapshot(
        `"Type foo: mappings added on model versions differs from the global mappings definition: field2.type"`
      );
    });

    it('does not throw if a schema is specified for a modelVersion with no changes', () => {
      const baseSchema = schema.object({ name: schema.string() });
      const type = createType({
        name: 'foo',
        switchToModelVersionAt: '8.10.0',
        modelVersions: {
          1: {
            changes: [],
            schemas: {
              forwardCompatibility: baseSchema.extends({}, { unknowns: 'ignore' }),
              create: baseSchema,
            },
          },
        },
        mappings: {
          properties: {
            name: { type: 'text' },
          },
        },
      });

      expect(() => validate({ type, kibanaVersion: '3.2.3' })).not.toThrow();
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
