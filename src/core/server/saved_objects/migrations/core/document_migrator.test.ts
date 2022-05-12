/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockGetConvertedObjectId } from './document_migrator.test.mock';
import { set } from '@elastic/safer-lodash-set';
import _ from 'lodash';
import { SavedObjectUnsanitizedDoc } from '../../serialization';
import { DocumentMigrator } from './document_migrator';
import { TransformSavedObjectDocumentError } from './transform_saved_object_document_error';
import { loggingSystemMock } from '../../../logging/logging_system.mock';
import { SavedObjectsType } from '../../types';
import { SavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { LEGACY_URL_ALIAS_TYPE } from '../../object_types';

const mockLoggerFactory = loggingSystemMock.create();
const mockLogger = mockLoggerFactory.get('mock logger');
const kibanaVersion = '25.2.3';

const createRegistry = (...types: Array<Partial<SavedObjectsType>>) => {
  const registry = new SavedObjectTypeRegistry();
  types.forEach((type) =>
    registry.registerType({
      name: 'unknown',
      namespaceType: 'single',
      hidden: false,
      mappings: { properties: {} },
      migrations: {},
      ...type,
    })
  );
  registry.registerType({
    name: LEGACY_URL_ALIAS_TYPE,
    namespaceType: 'agnostic',
    hidden: false,
    mappings: { properties: {} },
    migrations: {
      '0.1.2': () => ({} as SavedObjectUnsanitizedDoc), // the migration version is non-existent and the result doesn't matter, this migration function is never applied, we just want to assert that aliases are marked as "up-to-date"
    },
  });
  return registry;
};

beforeEach(() => {
  mockGetConvertedObjectId.mockClear();
});

describe('DocumentMigrator', () => {
  function testOpts() {
    return {
      kibanaVersion,
      typeRegistry: createRegistry(),
      minimumConvertVersion: '0.0.0', // no minimum version unless we specify it for a test case
      log: mockLogger,
    };
  }

  describe('validation', () => {
    const createDefinition = (migrations: any) => ({
      kibanaVersion: '3.2.3',
      typeRegistry: createRegistry({
        name: 'foo',
        migrations: migrations as any,
      }),
      log: mockLogger,
    });

    describe('#prepareMigrations', () => {
      it('validates individual migration definitions', () => {
        const invalidMigrator = new DocumentMigrator(createDefinition(() => 123));
        const voidMigrator = new DocumentMigrator(createDefinition(() => {}));
        const emptyObjectMigrator = new DocumentMigrator(createDefinition(() => ({})));

        expect(invalidMigrator.prepareMigrations).toThrow(
          /Migrations map for type foo should be an object/i
        );
        expect(voidMigrator.prepareMigrations).not.toThrow();
        expect(emptyObjectMigrator.prepareMigrations).not.toThrow();
      });

      it('validates individual migrations are valid semvers', () => {
        const withInvalidVersion = {
          bar: (doc: any) => doc,
          '1.2.3': (doc: any) => doc,
        };
        const migrationFn = new DocumentMigrator(createDefinition(() => withInvalidVersion));
        const migrationObj = new DocumentMigrator(createDefinition(withInvalidVersion));

        expect(migrationFn.prepareMigrations).toThrow(/Expected all properties to be semvers/i);
        expect(migrationObj.prepareMigrations).toThrow(/Expected all properties to be semvers/i);
      });

      it('validates individual migrations are not greater than the current Kibana version', () => {
        const withGreaterVersion = {
          '3.2.4': (doc: any) => doc,
        };
        const migrationFn = new DocumentMigrator(createDefinition(() => withGreaterVersion));
        const migrationObj = new DocumentMigrator(createDefinition(withGreaterVersion));

        const expectedError = `Invalid migration for type foo. Property '3.2.4' cannot be greater than the current Kibana version '3.2.3'.`;
        expect(migrationFn.prepareMigrations).toThrowError(expectedError);
        expect(migrationObj.prepareMigrations).toThrowError(expectedError);
      });

      it('validates the migration function', () => {
        const invalidVersionFunction = { '1.2.3': 23 as any };
        const migrationFn = new DocumentMigrator(createDefinition(() => invalidVersionFunction));
        const migrationObj = new DocumentMigrator(createDefinition(invalidVersionFunction));

        expect(migrationFn.prepareMigrations).toThrow(/expected a function, but got 23/i);
        expect(migrationObj.prepareMigrations).toThrow(/expected a function, but got 23/i);
      });
      it('validates definitions with migrations: Function | Objects', () => {
        const validMigrationMap = { '1.2.3': () => {} };
        const migrationFn = new DocumentMigrator(createDefinition(() => validMigrationMap));
        const migrationObj = new DocumentMigrator(createDefinition(validMigrationMap));
        expect(migrationFn.prepareMigrations).not.toThrow();
        expect(migrationObj.prepareMigrations).not.toThrow();
      });
    });

    it('throws if #prepareMigrations is not called before #migrate or #migrateAndConvert is called', () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry({
          name: 'user',
          migrations: {
            '1.2.3': setAttr('attributes.name', 'Chris'),
          },
        }),
      });

      expect(() =>
        migrator.migrate({
          id: 'me',
          type: 'user',
          attributes: { name: 'Christopher' },
          migrationVersion: {},
        })
      ).toThrow(/Migrations are not ready. Make sure prepareMigrations is called first./i);

      expect(() =>
        migrator.migrateAndConvert({
          id: 'me',
          type: 'user',
          attributes: { name: 'Christopher' },
          migrationVersion: {},
        })
      ).toThrow(/Migrations are not ready. Make sure prepareMigrations is called first./i);
    });

    it(`validates convertToMultiNamespaceTypeVersion can only be used with namespaceType 'multiple' or 'multiple-isolated'`, () => {
      const invalidDefinition = {
        kibanaVersion: '3.2.3',
        typeRegistry: createRegistry({
          name: 'foo',
          convertToMultiNamespaceTypeVersion: 'bar',
        }),
        minimumConvertVersion: '0.0.0',
        log: mockLogger,
      };
      expect(() => new DocumentMigrator(invalidDefinition)).toThrow(
        `Invalid convertToMultiNamespaceTypeVersion for type foo. Expected namespaceType to be 'multiple' or 'multiple-isolated', but got 'single'.`
      );
    });

    it(`validates convertToMultiNamespaceTypeVersion must be a semver`, () => {
      const invalidDefinition = {
        kibanaVersion: '3.2.3',
        typeRegistry: createRegistry({
          name: 'foo',
          convertToMultiNamespaceTypeVersion: 'bar',
          namespaceType: 'multiple',
        }),
        minimumConvertVersion: '0.0.0',
        log: mockLogger,
      };
      expect(() => new DocumentMigrator(invalidDefinition)).toThrow(
        `Invalid convertToMultiNamespaceTypeVersion for type foo. Expected value to be a semver, but got 'bar'.`
      );
    });

    it('validates convertToMultiNamespaceTypeVersion is not less than the minimum allowed version', () => {
      const invalidDefinition = {
        kibanaVersion: '3.2.3',
        typeRegistry: createRegistry({
          name: 'foo',
          convertToMultiNamespaceTypeVersion: '3.2.4',
          namespaceType: 'multiple',
        }),
        // not using a minimumConvertVersion parameter, the default is 8.0.0
        log: mockLogger,
      };
      expect(() => new DocumentMigrator(invalidDefinition)).toThrowError(
        `Invalid convertToMultiNamespaceTypeVersion for type foo. Value '3.2.4' cannot be less than '8.0.0'.`
      );
    });

    it('validates convertToMultiNamespaceTypeVersion is not greater than the current Kibana version', () => {
      const invalidDefinition = {
        kibanaVersion: '3.2.3',
        typeRegistry: createRegistry({
          name: 'foo',
          convertToMultiNamespaceTypeVersion: '3.2.4',
          namespaceType: 'multiple',
        }),
        minimumConvertVersion: '0.0.0',
        log: mockLogger,
      };
      expect(() => new DocumentMigrator(invalidDefinition)).toThrowError(
        `Invalid convertToMultiNamespaceTypeVersion for type foo. Value '3.2.4' cannot be greater than the current Kibana version '3.2.3'.`
      );
    });

    it('validates convertToMultiNamespaceTypeVersion is not used on a patch version', () => {
      const invalidDefinition = {
        kibanaVersion: '3.2.3',
        typeRegistry: createRegistry({
          name: 'foo',
          convertToMultiNamespaceTypeVersion: '3.1.1',
          namespaceType: 'multiple',
        }),
        minimumConvertVersion: '0.0.0',
        log: mockLogger,
      };
      expect(() => new DocumentMigrator(invalidDefinition)).toThrowError(
        `Invalid convertToMultiNamespaceTypeVersion for type foo. Value '3.1.1' cannot be used on a patch version (must be like 'x.y.0').`
      );
    });
  });

  describe('migration', () => {
    it('migrates type and attributes', () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry({
          name: 'user',
          migrations: {
            '1.2.3': setAttr('attributes.name', 'Chris'),
          },
        }),
      });
      migrator.prepareMigrations();
      const actual = migrator.migrate({
        id: 'me',
        type: 'user',
        attributes: { name: 'Christopher' },
        migrationVersion: {},
      });
      expect(actual).toEqual({
        id: 'me',
        type: 'user',
        attributes: { name: 'Chris' },
        migrationVersion: { user: '1.2.3' },
        coreMigrationVersion: kibanaVersion,
      });
    });

    it(`doesn't mutate the original document`, () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry({
          name: 'user',
          migrations: {
            '1.2.3': (doc) => {
              set(doc, 'attributes.name', 'Mike');
              return doc;
            },
          },
        }),
      });
      migrator.prepareMigrations();
      const originalDoc = {
        id: 'me',
        type: 'user',
        attributes: {},
        migrationVersion: {},
      };
      const migratedDoc = migrator.migrate(originalDoc);
      expect(_.get(originalDoc, 'attributes.name')).toBeUndefined();
      expect(_.get(migratedDoc, 'attributes.name')).toBe('Mike');
    });

    it('migrates root properties', () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry({
          name: 'acl',
          migrations: {
            '2.3.5': setAttr('acl', 'admins-only, sucka!'),
          },
        }),
      });
      migrator.prepareMigrations();
      const actual = migrator.migrate({
        id: 'me',
        type: 'user',
        attributes: { name: 'Tyler' },
        acl: 'anyone',
        migrationVersion: {},
      } as SavedObjectUnsanitizedDoc);
      expect(actual).toEqual({
        id: 'me',
        type: 'user',
        attributes: { name: 'Tyler' },
        migrationVersion: { acl: '2.3.5' },
        acl: 'admins-only, sucka!',
        coreMigrationVersion: kibanaVersion,
      });
    });

    it('does not apply migrations to unrelated docs', () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry(
          {
            name: 'aaa',
            migrations: {
              '1.0.0': setAttr('aaa', 'A'),
            },
          },
          {
            name: 'bbb',
            migrations: {
              '1.0.0': setAttr('bbb', 'B'),
            },
          },
          {
            name: 'ccc',
            migrations: {
              '1.0.0': setAttr('ccc', 'C'),
            },
          }
        ),
      });
      migrator.prepareMigrations();
      const actual = migrator.migrate({
        id: 'me',
        type: 'user',
        attributes: { name: 'Tyler' },
        migrationVersion: {},
      });
      expect(actual).toEqual({
        id: 'me',
        type: 'user',
        attributes: { name: 'Tyler' },
        coreMigrationVersion: kibanaVersion,
      });
    });

    it('assumes documents w/ undefined migrationVersion and correct coreMigrationVersion are up to date', () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry(
          {
            name: 'user',
            migrations: {
              '1.0.0': setAttr('aaa', 'A'),
            },
          },
          {
            name: 'bbb',
            migrations: {
              '2.3.4': setAttr('bbb', 'B'),
            },
          },
          {
            name: 'ccc',
            migrations: {
              '1.0.0': setAttr('ccc', 'C'),
            },
          }
        ),
      });
      migrator.prepareMigrations();
      const actual = migrator.migrate({
        id: 'me',
        type: 'user',
        attributes: { name: 'Tyler' },
        bbb: 'Shazm',
        coreMigrationVersion: kibanaVersion,
      } as SavedObjectUnsanitizedDoc);
      expect(actual).toEqual({
        id: 'me',
        type: 'user',
        attributes: { name: 'Tyler' },
        bbb: 'Shazm',
        migrationVersion: {
          user: '1.0.0',
          bbb: '2.3.4',
        },
        coreMigrationVersion: kibanaVersion,
      });
    });

    it('only applies migrations that are more recent than the doc', () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry({
          name: 'dog',
          migrations: {
            '1.2.3': setAttr('attributes.a', 'A'),
            '1.2.4': setAttr('attributes.b', 'B'),
            '2.0.1': setAttr('attributes.c', 'C'),
          },
        }),
      });
      migrator.prepareMigrations();
      const actual = migrator.migrate({
        id: 'smelly',
        type: 'dog',
        attributes: { name: 'Callie' },
        migrationVersion: { dog: '1.2.3' },
      });
      expect(actual).toEqual({
        id: 'smelly',
        type: 'dog',
        attributes: { name: 'Callie', b: 'B', c: 'C' },
        migrationVersion: { dog: '2.0.1' },
        coreMigrationVersion: kibanaVersion,
      });
    });

    it('rejects docs with a migrationVersion[type] for a type that does not have any migrations defined', () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
      });
      migrator.prepareMigrations();
      expect(() =>
        migrator.migrate({
          id: 'smelly',
          type: 'dog',
          attributes: { name: 'Callie' },
          migrationVersion: { dog: '10.2.0' },
        })
      ).toThrow(
        /Document "smelly" has property "dog" which belongs to a more recent version of Kibana \[10\.2\.0\]\. The last known version is \[undefined\]/i
      );
    });

    it('rejects docs with a migrationVersion[type] for a type that does not have a migration >= that version defined', () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry({
          name: 'dawg',
          migrations: {
            '1.2.3': setAttr('attributes.a', 'A'),
          },
        }),
      });
      migrator.prepareMigrations();
      expect(() =>
        migrator.migrate({
          id: 'fleabag',
          type: 'dawg',
          attributes: { name: 'Callie' },
          migrationVersion: { dawg: '1.2.4' },
        })
      ).toThrow(
        /Document "fleabag" has property "dawg" which belongs to a more recent version of Kibana \[1\.2\.4\]\. The last known version is \[1\.2\.3\]/i
      );
    });

    it('rejects docs that have an invalid coreMigrationVersion', () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
        kibanaVersion: '8.0.1',
      });
      migrator.prepareMigrations();
      expect(() =>
        migrator.migrate({
          id: 'happy',
          type: 'dog',
          attributes: { name: 'Callie' },
          coreMigrationVersion: 'not-a-semver',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Document \\"happy\\" has an invalid \\"coreMigrationVersion\\" [not-a-semver]. This must be a semver value."`
      );
    });

    it('rejects docs that have a coreMigrationVersion higher than the current Kibana version', () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
        kibanaVersion: '8.0.1',
      });
      migrator.prepareMigrations();
      expect(() =>
        migrator.migrate({
          id: 'wet',
          type: 'dog',
          attributes: { name: 'Callie' },
          coreMigrationVersion: '8.0.2',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Document \\"wet\\" has a \\"coreMigrationVersion\\" which belongs to a more recent version of Kibana [8.0.2]. The current version is [8.0.1]."`
      );
    });

    it('applies migrations in order', () => {
      let count = 0;
      const migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry({
          name: 'dog',
          migrations: {
            '2.2.4': setAttr('attributes.b', () => ++count),
            '10.0.1': setAttr('attributes.c', () => ++count),
            '1.2.3': setAttr('attributes.a', () => ++count),
          },
        }),
      });
      migrator.prepareMigrations();
      const actual = migrator.migrate({
        id: 'smelly',
        type: 'dog',
        attributes: { name: 'Callie' },
        migrationVersion: { dog: '1.2.0' },
      });
      expect(actual).toEqual({
        id: 'smelly',
        type: 'dog',
        attributes: { name: 'Callie', a: 1, b: 2, c: 3 },
        migrationVersion: { dog: '10.0.1' },
        coreMigrationVersion: kibanaVersion,
      });
    });

    it('allows props to be added', () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry(
          {
            name: 'animal',
            migrations: {
              '1.0.0': setAttr('animal', (name: string) => `Animal: ${name}`),
            },
          },
          {
            name: 'dog',
            migrations: {
              '2.2.4': setAttr('animal', 'Doggie'),
            },
          }
        ),
      });
      migrator.prepareMigrations();
      const actual = migrator.migrate({
        id: 'smelly',
        type: 'dog',
        attributes: { name: 'Callie' },
        migrationVersion: { dog: '1.2.0' },
      });
      expect(actual).toEqual({
        id: 'smelly',
        type: 'dog',
        attributes: { name: 'Callie' },
        animal: 'Animal: Doggie',
        migrationVersion: { animal: '1.0.0', dog: '2.2.4' },
        coreMigrationVersion: kibanaVersion,
      });
    });

    it('allows props to be renamed', () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry({
          name: 'dog',
          migrations: {
            '1.0.0': setAttr('attributes.name', (name: string) => `Name: ${name}`),
            '1.0.1': renameAttr('attributes.name', 'attributes.title'),
            '1.0.2': setAttr('attributes.title', (name: string) => `Title: ${name}`),
          },
        }),
      });
      migrator.prepareMigrations();
      const actual = migrator.migrate({
        id: 'smelly',
        type: 'dog',
        attributes: { name: 'Callie' },
        migrationVersion: {},
      });
      expect(actual).toEqual({
        id: 'smelly',
        type: 'dog',
        attributes: { title: 'Title: Name: Callie' },
        migrationVersion: { dog: '1.0.2' },
        coreMigrationVersion: kibanaVersion,
      });
    });

    it('allows changing type', () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry(
          {
            name: 'cat',
            migrations: {
              '1.0.0': setAttr('attributes.name', (name: string) => `Kitty ${name}`),
            },
          },
          {
            name: 'dog',
            migrations: {
              '2.2.4': setAttr('type', 'cat'),
            },
          }
        ),
      });
      migrator.prepareMigrations();
      const actual = migrator.migrate({
        id: 'smelly',
        type: 'dog',
        attributes: { name: 'Callie' },
        migrationVersion: {},
      });
      expect(actual).toEqual({
        id: 'smelly',
        type: 'cat',
        attributes: { name: 'Kitty Callie' },
        migrationVersion: { dog: '2.2.4', cat: '1.0.0' },
        coreMigrationVersion: kibanaVersion,
      });
    });

    it('disallows updating a migrationVersion prop to a lower version', () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry({
          name: 'cat',
          migrations: {
            '1.0.0': setAttr('migrationVersion.foo', '3.2.1'),
          },
        }),
      });
      migrator.prepareMigrations();
      expect(() =>
        migrator.migrate({
          id: 'smelly',
          type: 'cat',
          attributes: { name: 'Boo' },
          migrationVersion: { foo: '4.5.6' },
        })
      ).toThrow(
        /Migration "cat v 1.0.0" attempted to downgrade "migrationVersion.foo" from 4.5.6 to 3.2.1./
      );
    });

    it('disallows removing a migrationVersion prop', () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry({
          name: 'cat',
          migrations: {
            '1.0.0': setAttr('migrationVersion', {}),
          },
        }),
      });
      migrator.prepareMigrations();
      expect(() =>
        migrator.migrate({
          id: 'smelly',
          type: 'cat',
          attributes: { name: 'Boo' },
          migrationVersion: { foo: '4.5.6' },
        })
      ).toThrow(
        /Migration "cat v 1.0.0" attempted to downgrade "migrationVersion.foo" from 4.5.6 to undefined./
      );
    });

    it('allows adding props to migrationVersion', () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry({
          name: 'cat',
          migrations: {
            '1.0.0': setAttr('migrationVersion.foo', '5.6.7'),
          },
        }),
      });
      migrator.prepareMigrations();
      const actual = migrator.migrate({
        id: 'smelly',
        type: 'cat',
        attributes: { name: 'Boo' },
        migrationVersion: {},
      });
      expect(actual).toEqual({
        id: 'smelly',
        type: 'cat',
        attributes: { name: 'Boo' },
        migrationVersion: { cat: '1.0.0', foo: '5.6.7' },
        coreMigrationVersion: kibanaVersion,
      });
    });

    it('logs the original error and throws a transform error if a document transform fails', () => {
      const log = mockLogger;
      const failedDoc = {
        id: 'smelly',
        type: 'dog',
        attributes: {},
        migrationVersion: {},
      };
      const migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry({
          name: 'dog',
          migrations: {
            '1.2.3': () => {
              throw new Error('Dang diggity!');
            },
          },
        }),
        log,
      });
      migrator.prepareMigrations();
      try {
        migrator.migrate(_.cloneDeep(failedDoc));
        expect('Did not throw').toEqual('But it should have!');
      } catch (error) {
        expect(error.message).toEqual('Migration function for version 1.2.3 threw an error');
        expect(error.stack.includes(`Caused by:\nError: Dang diggity!`)).toBe(true);
        expect(error).toBeInstanceOf(TransformSavedObjectDocumentError);
      }
    });

    it('logs message in transform function', () => {
      const logTestMsg = '...said the joker to the thief';
      const migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry({
          name: 'dog',
          migrations: {
            '1.2.3': (doc, { log }) => {
              log.info(logTestMsg);
              log.warning(logTestMsg);
              return doc;
            },
          },
        }),
        log: mockLogger,
      });
      migrator.prepareMigrations();
      const doc = {
        id: 'joker',
        type: 'dog',
        attributes: {},
        migrationVersion: {},
      };
      migrator.migrate(doc);
      expect(loggingSystemMock.collect(mockLoggerFactory).info[0][0]).toEqual(logTestMsg);
      expect(loggingSystemMock.collect(mockLoggerFactory).warn[0][0]).toEqual(logTestMsg);
    });

    test('extracts the latest migration version info', () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry(
          {
            name: 'aaa',
            migrations: {
              '1.2.3': (doc: SavedObjectUnsanitizedDoc) => doc,
              '10.4.0': (doc: SavedObjectUnsanitizedDoc) => doc,
              '2.2.1': (doc: SavedObjectUnsanitizedDoc) => doc,
            },
          },
          {
            name: 'bbb',
            migrations: {
              '3.2.3': (doc: SavedObjectUnsanitizedDoc) => doc,
              '2.0.0': (doc: SavedObjectUnsanitizedDoc) => doc,
            },
          },
          {
            name: 'ccc',
            namespaceType: 'multiple',
            migrations: {
              '9.0.0': (doc: SavedObjectUnsanitizedDoc) => doc,
            },
            convertToMultiNamespaceTypeVersion: '11.0.0', // this results in reference transforms getting added to other types, but does not increase the migrationVersion of those types
          }
        ),
      });
      migrator.prepareMigrations();
      expect(migrator.migrationVersion).toEqual({
        aaa: '10.4.0',
        bbb: '3.2.3',
        ccc: '11.0.0',
        [LEGACY_URL_ALIAS_TYPE]: '0.1.2',
      });
    });

    describe('conversion to multi-namespace type', () => {
      it('assumes documents w/ undefined migrationVersion and correct coreMigrationVersion are up to date', () => {
        const migrator = new DocumentMigrator({
          ...testOpts(),
          typeRegistry: createRegistry(
            { name: 'dog', namespaceType: 'multiple', convertToMultiNamespaceTypeVersion: '1.0.0' }
            // no migration transforms are defined, the migrationVersion will be derived from 'convertToMultiNamespaceTypeVersion'
          ),
        });
        migrator.prepareMigrations();
        const obj = {
          id: 'mischievous',
          type: 'dog',
          attributes: { name: 'Ann' },
          coreMigrationVersion: kibanaVersion,
        } as SavedObjectUnsanitizedDoc;
        const actual = migrator.migrateAndConvert(obj);
        expect(actual).toEqual([
          {
            id: 'mischievous',
            type: 'dog',
            attributes: { name: 'Ann' },
            migrationVersion: { dog: '1.0.0' },
            coreMigrationVersion: kibanaVersion,
            // there is no 'namespaces' field because no transforms were applied; this scenario is contrived for a clean test case but is not indicative of a real-world scenario
          },
        ]);
      });

      it('skips reference transforms and conversion transforms when using `migrate`', () => {
        const migrator = new DocumentMigrator({
          ...testOpts(),
          typeRegistry: createRegistry(
            { name: 'dog', namespaceType: 'multiple', convertToMultiNamespaceTypeVersion: '1.0.0' },
            { name: 'toy', namespaceType: 'multiple', convertToMultiNamespaceTypeVersion: '1.0.0' }
          ),
        });
        migrator.prepareMigrations();
        const obj = {
          id: 'cowardly',
          type: 'dog',
          attributes: { name: 'Leslie' },
          migrationVersion: {},
          references: [{ id: 'favorite', type: 'toy', name: 'BALL!' }],
          namespace: 'foo-namespace',
        };
        const actual = migrator.migrate(obj);
        expect(mockGetConvertedObjectId).not.toHaveBeenCalled();
        expect(actual).toEqual({
          id: 'cowardly',
          type: 'dog',
          attributes: { name: 'Leslie' },
          migrationVersion: { dog: '1.0.0' },
          references: [{ id: 'favorite', type: 'toy', name: 'BALL!' }],
          coreMigrationVersion: kibanaVersion,
          namespace: 'foo-namespace',
          // there is no 'namespaces' field because no conversion transform was applied; this scenario is contrived for a clean test case but is not indicative of a real-world scenario
        });
      });

      describe('correctly applies reference transforms', () => {
        const migrator = new DocumentMigrator({
          ...testOpts(),
          typeRegistry: createRegistry(
            { name: 'dog', namespaceType: 'single' },
            { name: 'toy', namespaceType: 'multiple', convertToMultiNamespaceTypeVersion: '1.0.0' }
          ),
        });
        migrator.prepareMigrations();
        const obj = {
          id: 'bad',
          type: 'dog',
          attributes: { name: 'Sweet Peach' },
          migrationVersion: {},
          references: [{ id: 'favorite', type: 'toy', name: 'BALL!' }],
        };

        it('in the default space', () => {
          const actual = migrator.migrateAndConvert(obj);
          expect(mockGetConvertedObjectId).not.toHaveBeenCalled();
          expect(actual).toEqual([
            {
              id: 'bad',
              type: 'dog',
              attributes: { name: 'Sweet Peach' },
              references: [{ id: 'favorite', type: 'toy', name: 'BALL!' }], // no change
              coreMigrationVersion: kibanaVersion,
            },
          ]);
        });

        it('in a non-default space', () => {
          const actual = migrator.migrateAndConvert({ ...obj, namespace: 'foo-namespace' });
          expect(mockGetConvertedObjectId).toHaveBeenCalledTimes(1);
          expect(mockGetConvertedObjectId).toHaveBeenCalledWith('foo-namespace', 'toy', 'favorite');
          expect(actual).toEqual([
            {
              id: 'bad',
              type: 'dog',
              attributes: { name: 'Sweet Peach' },
              references: [{ id: 'uuidv5', type: 'toy', name: 'BALL!' }], // changed
              coreMigrationVersion: kibanaVersion,
              namespace: 'foo-namespace',
            },
          ]);
        });
      });

      describe('correctly applies conversion transforms', () => {
        const migrator = new DocumentMigrator({
          ...testOpts(),
          typeRegistry: createRegistry({
            name: 'dog',
            namespaceType: 'multiple',
            convertToMultiNamespaceTypeVersion: '1.0.0',
          }),
        });
        migrator.prepareMigrations();
        const obj = {
          id: 'loud',
          type: 'dog',
          attributes: { name: 'Wally' },
          migrationVersion: {},
        };

        it('in the default space', () => {
          const actual = migrator.migrateAndConvert(obj);
          expect(mockGetConvertedObjectId).not.toHaveBeenCalled();
          expect(actual).toEqual([
            {
              id: 'loud',
              type: 'dog',
              attributes: { name: 'Wally' },
              migrationVersion: { dog: '1.0.0' },
              coreMigrationVersion: kibanaVersion,
              namespaces: ['default'],
            },
          ]);
        });

        it('in a non-default space', () => {
          const actual = migrator.migrateAndConvert({ ...obj, namespace: 'foo-namespace' });
          expect(mockGetConvertedObjectId).toHaveBeenCalledTimes(1);
          expect(mockGetConvertedObjectId).toHaveBeenCalledWith('foo-namespace', 'dog', 'loud');
          expect(actual).toEqual([
            {
              id: 'uuidv5',
              type: 'dog',
              attributes: { name: 'Wally' },
              migrationVersion: { dog: '1.0.0' },
              coreMigrationVersion: kibanaVersion,
              namespaces: ['foo-namespace'],
              originId: 'loud',
            },
            {
              id: 'foo-namespace:dog:loud',
              type: LEGACY_URL_ALIAS_TYPE,
              attributes: {
                sourceId: 'loud',
                targetNamespace: 'foo-namespace',
                targetType: 'dog',
                targetId: 'uuidv5',
                purpose: 'savedObjectConversion',
              },
              migrationVersion: { [LEGACY_URL_ALIAS_TYPE]: '0.1.2' },
              coreMigrationVersion: kibanaVersion,
            },
          ]);
        });
      });

      describe('correctly applies reference and conversion transforms', () => {
        const migrator = new DocumentMigrator({
          ...testOpts(),
          typeRegistry: createRegistry(
            { name: 'dog', namespaceType: 'multiple', convertToMultiNamespaceTypeVersion: '1.0.0' },
            { name: 'toy', namespaceType: 'multiple', convertToMultiNamespaceTypeVersion: '1.0.0' }
          ),
        });
        migrator.prepareMigrations();
        const obj = {
          id: 'cute',
          type: 'dog',
          attributes: { name: 'Too' },
          migrationVersion: {},
          references: [{ id: 'favorite', type: 'toy', name: 'BALL!' }],
        };

        it('in the default space', () => {
          const actual = migrator.migrateAndConvert(obj);
          expect(mockGetConvertedObjectId).not.toHaveBeenCalled();
          expect(actual).toEqual([
            {
              id: 'cute',
              type: 'dog',
              attributes: { name: 'Too' },
              migrationVersion: { dog: '1.0.0' },
              references: [{ id: 'favorite', type: 'toy', name: 'BALL!' }], // no change
              coreMigrationVersion: kibanaVersion,
              namespaces: ['default'],
            },
          ]);
        });

        it('in a non-default space', () => {
          const actual = migrator.migrateAndConvert({ ...obj, namespace: 'foo-namespace' });
          expect(mockGetConvertedObjectId).toHaveBeenCalledTimes(2);
          expect(mockGetConvertedObjectId).toHaveBeenNthCalledWith(
            1,
            'foo-namespace',
            'toy',
            'favorite'
          );
          expect(mockGetConvertedObjectId).toHaveBeenNthCalledWith(
            2,
            'foo-namespace',
            'dog',
            'cute'
          );
          expect(actual).toEqual([
            {
              id: 'uuidv5',
              type: 'dog',
              attributes: { name: 'Too' },
              migrationVersion: { dog: '1.0.0' },
              references: [{ id: 'uuidv5', type: 'toy', name: 'BALL!' }], // changed
              coreMigrationVersion: kibanaVersion,
              namespaces: ['foo-namespace'],
              originId: 'cute',
            },
            {
              id: 'foo-namespace:dog:cute',
              type: LEGACY_URL_ALIAS_TYPE,
              attributes: {
                sourceId: 'cute',
                targetNamespace: 'foo-namespace',
                targetType: 'dog',
                targetId: 'uuidv5',
                purpose: 'savedObjectConversion',
              },
              migrationVersion: { [LEGACY_URL_ALIAS_TYPE]: '0.1.2' },
              coreMigrationVersion: kibanaVersion,
            },
          ]);
        });
      });

      describe('correctly applies reference and migration transforms', () => {
        const migrator = new DocumentMigrator({
          ...testOpts(),
          typeRegistry: createRegistry(
            {
              name: 'dog',
              namespaceType: 'single',
              migrations: {
                '1.1.0': setAttr('attributes.age', '12'),
                '1.5.0': setAttr('attributes.color', 'tri-color'),
                '2.0.0': (doc) => doc, // noop
              },
            },
            { name: 'toy', namespaceType: 'multiple', convertToMultiNamespaceTypeVersion: '1.0.0' }
          ),
        });
        migrator.prepareMigrations();
        const obj = {
          id: 'sleepy',
          type: 'dog',
          attributes: { name: 'Patches', age: '11' },
          migrationVersion: { dog: '1.1.0' }, // skip the first migration transform, only apply the second and third
          references: [{ id: 'favorite', type: 'toy', name: 'BALL!' }],
          coreMigrationVersion: undefined, // this is intentional
        };

        it('in the default space', () => {
          const actual = migrator.migrateAndConvert(obj);
          expect(mockGetConvertedObjectId).not.toHaveBeenCalled();
          expect(actual).toEqual([
            {
              id: 'sleepy',
              type: 'dog',
              attributes: { name: 'Patches', age: '11', color: 'tri-color' },
              migrationVersion: { dog: '2.0.0' },
              references: [{ id: 'favorite', type: 'toy', name: 'BALL!' }], // no change
              coreMigrationVersion: kibanaVersion,
            },
          ]);
        });

        it('in a non-default space', () => {
          const actual = migrator.migrateAndConvert({ ...obj, namespace: 'foo-namespace' });
          expect(mockGetConvertedObjectId).toHaveBeenCalledTimes(1);
          expect(mockGetConvertedObjectId).toHaveBeenCalledWith('foo-namespace', 'toy', 'favorite');
          expect(actual).toEqual([
            {
              id: 'sleepy',
              type: 'dog',
              attributes: { name: 'Patches', age: '11', color: 'tri-color' },
              migrationVersion: { dog: '2.0.0' },
              references: [{ id: 'uuidv5', type: 'toy', name: 'BALL!' }], // changed
              coreMigrationVersion: kibanaVersion,
              namespace: 'foo-namespace',
            },
          ]);
        });
      });

      describe('correctly applies conversion and migration transforms', () => {
        const migrator = new DocumentMigrator({
          ...testOpts(),
          typeRegistry: createRegistry({
            name: 'dog',
            namespaceType: 'multiple',
            migrations: {
              '1.0.0': setAttr('migrationVersion.dog', '2.0.0'),
              '2.0.0': (doc) => doc, // noop
            },
            convertToMultiNamespaceTypeVersion: '1.0.0', // the conversion transform occurs before the migration transform above
          }),
        });
        migrator.prepareMigrations();
        const obj = {
          id: 'hungry',
          type: 'dog',
          attributes: { name: 'Remy' },
          migrationVersion: {},
        };

        it('in the default space', () => {
          const actual = migrator.migrateAndConvert(obj);
          expect(mockGetConvertedObjectId).not.toHaveBeenCalled();
          expect(actual).toEqual([
            {
              id: 'hungry',
              type: 'dog',
              attributes: { name: 'Remy' },
              migrationVersion: { dog: '2.0.0' },
              coreMigrationVersion: kibanaVersion,
              namespaces: ['default'],
            },
          ]);
        });

        it('in a non-default space', () => {
          const actual = migrator.migrateAndConvert({ ...obj, namespace: 'foo-namespace' });
          expect(mockGetConvertedObjectId).toHaveBeenCalledTimes(1);
          expect(mockGetConvertedObjectId).toHaveBeenCalledWith('foo-namespace', 'dog', 'hungry');
          expect(actual).toEqual([
            {
              id: 'uuidv5',
              type: 'dog',
              attributes: { name: 'Remy' },
              migrationVersion: { dog: '2.0.0' },
              coreMigrationVersion: kibanaVersion,
              namespaces: ['foo-namespace'],
              originId: 'hungry',
            },
            {
              id: 'foo-namespace:dog:hungry',
              type: LEGACY_URL_ALIAS_TYPE,
              attributes: {
                sourceId: 'hungry',
                targetNamespace: 'foo-namespace',
                targetType: 'dog',
                targetId: 'uuidv5',
                purpose: 'savedObjectConversion',
              },
              migrationVersion: { [LEGACY_URL_ALIAS_TYPE]: '0.1.2' },
              coreMigrationVersion: kibanaVersion,
            },
          ]);
        });
      });

      describe('correctly applies reference, conversion, and migration transforms', () => {
        const migrator = new DocumentMigrator({
          ...testOpts(),
          typeRegistry: createRegistry(
            {
              name: 'dog',
              namespaceType: 'multiple',
              migrations: {
                '1.0.0': setAttr('migrationVersion.dog', '2.0.0'),
                '2.0.0': (doc) => doc, // noop
              },
              convertToMultiNamespaceTypeVersion: '1.0.0',
            },
            { name: 'toy', namespaceType: 'multiple', convertToMultiNamespaceTypeVersion: '1.0.0' }
          ),
        });
        migrator.prepareMigrations();
        const obj = {
          id: 'pretty',
          type: 'dog',
          attributes: { name: 'Sasha' },
          migrationVersion: {},
          references: [{ id: 'favorite', type: 'toy', name: 'BALL!' }],
        };

        it('in the default space', () => {
          const actual = migrator.migrateAndConvert(obj);
          expect(mockGetConvertedObjectId).not.toHaveBeenCalled();
          expect(actual).toEqual([
            {
              id: 'pretty',
              type: 'dog',
              attributes: { name: 'Sasha' },
              migrationVersion: { dog: '2.0.0' },
              references: [{ id: 'favorite', type: 'toy', name: 'BALL!' }], // no change
              coreMigrationVersion: kibanaVersion,
              namespaces: ['default'],
            },
          ]);
        });

        it('in a non-default space', () => {
          const actual = migrator.migrateAndConvert({ ...obj, namespace: 'foo-namespace' });
          expect(mockGetConvertedObjectId).toHaveBeenCalledTimes(2);
          expect(mockGetConvertedObjectId).toHaveBeenNthCalledWith(
            1,
            'foo-namespace',
            'toy',
            'favorite'
          );
          expect(mockGetConvertedObjectId).toHaveBeenNthCalledWith(
            2,
            'foo-namespace',
            'dog',
            'pretty'
          );
          expect(actual).toEqual([
            {
              id: 'uuidv5',
              type: 'dog',
              attributes: { name: 'Sasha' },
              migrationVersion: { dog: '2.0.0' },
              references: [{ id: 'uuidv5', type: 'toy', name: 'BALL!' }], // changed
              coreMigrationVersion: kibanaVersion,
              namespaces: ['foo-namespace'],
              originId: 'pretty',
            },
            {
              id: 'foo-namespace:dog:pretty',
              type: LEGACY_URL_ALIAS_TYPE,
              attributes: {
                sourceId: 'pretty',
                targetNamespace: 'foo-namespace',
                targetType: 'dog',
                targetId: 'uuidv5',
                purpose: 'savedObjectConversion',
              },
              migrationVersion: { [LEGACY_URL_ALIAS_TYPE]: '0.1.2' },
              coreMigrationVersion: kibanaVersion,
            },
          ]);
        });
      });
    });
  });
});

function renameAttr(path: string, newPath: string) {
  return (doc: SavedObjectUnsanitizedDoc) =>
    _.omit(set(doc, newPath, _.get(doc, path)) as {}, path) as SavedObjectUnsanitizedDoc;
}

function setAttr(path: string, value: any) {
  return (doc: SavedObjectUnsanitizedDoc) =>
    set(
      doc,
      path,
      _.isFunction(value) ? value(_.get(doc, path)) : value
    ) as SavedObjectUnsanitizedDoc;
}
