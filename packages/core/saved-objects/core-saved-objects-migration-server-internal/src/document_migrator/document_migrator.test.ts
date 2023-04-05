/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  mockGetConvertedObjectId,
  validateTypeMigrationsMock,
} from './document_migrator.test.mock';
import { set } from '@kbn/safer-lodash-set';
import _ from 'lodash';
import type {
  SavedObjectUnsanitizedDoc,
  SavedObjectsType,
  SavedObjectModelTransformationFn,
} from '@kbn/core-saved-objects-server';
import {
  SavedObjectTypeRegistry,
  LEGACY_URL_ALIAS_TYPE,
  modelVersionToVirtualVersion,
} from '@kbn/core-saved-objects-base-server-internal';
import { DocumentMigrator } from './document_migrator';
import { TransformSavedObjectDocumentError } from '../core/transform_saved_object_document_error';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

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

const createDoc = (
  parts: Partial<SavedObjectUnsanitizedDoc<any>> = {}
): SavedObjectUnsanitizedDoc<any> => ({
  id: 'test-doc',
  type: 'test-type',
  attributes: {},
  references: [],
  coreMigrationVersion: kibanaVersion,
  ...parts,
});

beforeEach(() => {
  mockGetConvertedObjectId.mockClear();
  validateTypeMigrationsMock.mockReset();
});

describe('DocumentMigrator', () => {
  function testOpts() {
    return {
      kibanaVersion,
      typeRegistry: createRegistry(),
      log: mockLogger,
    };
  }

  describe('validation', () => {
    describe('during #prepareMigrations', () => {
      it('calls validateMigrationsMapObject with the correct parameters', () => {
        const ops = {
          ...testOpts(),
          typeRegistry: createRegistry(
            {
              name: 'foo',
              migrations: {
                '1.2.3': setAttr('attributes.name', 'Chris'),
              },
            },
            {
              name: 'bar',
              migrations: {
                '1.2.3': setAttr('attributes.name', 'Chris'),
              },
            }
          ),
        };

        const migrator = new DocumentMigrator(ops);

        expect(validateTypeMigrationsMock).not.toHaveBeenCalled();

        migrator.prepareMigrations();

        expect(validateTypeMigrationsMock).toHaveBeenCalledTimes(3);
        expect(validateTypeMigrationsMock).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            type: expect.objectContaining({ name: 'foo' }),
            kibanaVersion,
          })
        );
        expect(validateTypeMigrationsMock).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            type: expect.objectContaining({ name: 'bar' }),
            kibanaVersion,
          })
        );
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
          typeMigrationVersion: '',
        })
      ).toThrow(/Migrations are not ready. Make sure prepareMigrations is called first./i);

      expect(() =>
        migrator.migrateAndConvert({
          id: 'me',
          type: 'user',
          attributes: { name: 'Christopher' },
          typeMigrationVersion: '',
        })
      ).toThrow(/Migrations are not ready. Make sure prepareMigrations is called first./i);
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
        coreMigrationVersion: '8.8.0',
        typeMigrationVersion: '',
      });
      expect(actual).toEqual({
        id: 'me',
        type: 'user',
        attributes: { name: 'Chris' },
        coreMigrationVersion: '8.8.0',
        typeMigrationVersion: '1.2.3',
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
        coreMigrationVersion: '8.8.0',
        typeMigrationVersion: '',
      };
      const migratedDoc = migrator.migrate(originalDoc);
      expect(_.get(originalDoc, 'attributes.name')).toBeUndefined();
      expect(_.get(migratedDoc, 'attributes.name')).toBe('Mike');
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
        typeMigrationVersion: '',
      });
      expect(actual).toEqual({
        id: 'me',
        type: 'user',
        attributes: { name: 'Tyler' },
      });
    });

    it('assumes documents w/ undefined typeMigrationVersion and correct coreMigrationVersion are up to date', () => {
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
        coreMigrationVersion: kibanaVersion,
        typeMigrationVersion: '1.0.0',
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
        coreMigrationVersion: '8.8.0',
        typeMigrationVersion: '1.2.3',
      });
      expect(actual).toEqual({
        id: 'smelly',
        type: 'dog',
        attributes: { name: 'Callie', b: 'B', c: 'C' },
        coreMigrationVersion: '8.8.0',
        typeMigrationVersion: '2.0.1',
      });
    });

    it('rejects docs with a typeMigrationVersion for a type that does not have any migrations defined', () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
      });
      migrator.prepareMigrations();
      expect(() =>
        migrator.migrate({
          id: 'smelly',
          type: 'dog',
          attributes: { name: 'Callie' },
          coreMigrationVersion: '8.8.0',
          typeMigrationVersion: '10.2.0',
        })
      ).toThrow(
        /Document "smelly" belongs to a more recent version of Kibana \[10\.2\.0\] when the last known version is \[undefined\]/i
      );
    });

    it('rejects docs with a typeMigrationVersion for a type that does not have a migration >= that version defined', () => {
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
          typeMigrationVersion: '1.2.4',
        })
      ).toThrow(
        /Document "fleabag" belongs to a more recent version of Kibana \[1\.2\.4\]\ when the last known version is \[1\.2\.3\]/i
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
        coreMigrationVersion: '8.8.0',
        typeMigrationVersion: '1.2.0',
      });
      expect(actual).toEqual({
        id: 'smelly',
        type: 'dog',
        attributes: { name: 'Callie', a: 1, b: 2, c: 3 },
        coreMigrationVersion: '8.8.0',
        typeMigrationVersion: '10.0.1',
      });
    });

    it('allows props to be added', () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry({
          name: 'dog',
          migrations: {
            '2.2.4': setAttr('animal', 'Doggie'),
          },
        }),
      });
      migrator.prepareMigrations();
      const actual = migrator.migrate({
        id: 'smelly',
        type: 'dog',
        attributes: { name: 'Callie' },
        coreMigrationVersion: '8.8.0',
        typeMigrationVersion: '1.2.0',
      });
      expect(actual).toEqual({
        id: 'smelly',
        type: 'dog',
        attributes: { name: 'Callie' },
        animal: 'Doggie',
        coreMigrationVersion: '8.8.0',
        typeMigrationVersion: '2.2.4',
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
        coreMigrationVersion: '8.8.0',
        typeMigrationVersion: '',
      });
      expect(actual).toEqual({
        id: 'smelly',
        type: 'dog',
        attributes: { title: 'Title: Name: Callie' },
        coreMigrationVersion: '8.8.0',
        typeMigrationVersion: '1.0.2',
      });
    });

    it('does not allow changing type', () => {
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
      expect(() =>
        migrator.migrate({
          id: 'smelly',
          type: 'dog',
          attributes: { name: 'Callie' },
          typeMigrationVersion: '',
          coreMigrationVersion: '8.8.0',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Changing a document's type during a migration is not supported."`
      );
    });

    it('disallows updating a typeMigrationVersion prop to a lower version', () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry({
          name: 'cat',
          migrations: {
            '4.5.7': setAttr('typeMigrationVersion', '3.2.1'),
          },
        }),
      });
      migrator.prepareMigrations();
      expect(() =>
        migrator.migrate({
          id: 'smelly',
          type: 'cat',
          attributes: { name: 'Boo' },
          typeMigrationVersion: '4.5.6',
          coreMigrationVersion: '8.8.0',
        })
      ).toThrow(
        /Migration "cat v4.5.7" attempted to downgrade "typeMigrationVersion" from 4.5.6 to 3.2.1./
      );
    });

    it('disallows removing a typeMigrationVersion prop', () => {
      const migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry({
          name: 'cat',
          migrations: {
            '4.5.7': setAttr('typeMigrationVersion', undefined),
          },
        }),
      });
      migrator.prepareMigrations();
      expect(() =>
        migrator.migrate({
          id: 'smelly',
          type: 'cat',
          attributes: { name: 'Boo' },
          coreMigrationVersion: '8.8.0',
          typeMigrationVersion: '4.5.6',
        })
      ).toThrow(
        /Migration "cat v4.5.7" attempted to downgrade "typeMigrationVersion" from 4.5.6 to undefined./
      );
    });

    it('logs the original error and throws a transform error if a document transform fails', () => {
      const log = mockLogger;
      const failedDoc = {
        id: 'smelly',
        type: 'dog',
        attributes: {},
        typeMigrationVersion: '',
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
              log.warn(logTestMsg);
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
        typeMigrationVersion: '',
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
            convertToMultiNamespaceTypeVersion: '11.0.0', // this results in reference transforms getting added to other types, but does not increase the typeMigrationVersion of those types
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
      it('assumes documents w/ undefined typeMigrationVersion and correct coreMigrationVersion are up to date', () => {
        const migrator = new DocumentMigrator({
          ...testOpts(),
          typeRegistry: createRegistry(
            { name: 'dog', namespaceType: 'multiple', convertToMultiNamespaceTypeVersion: '1.0.0' }
            // no migration transforms are defined, the typeMigrationVersion will be derived from 'convertToMultiNamespaceTypeVersion'
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
            coreMigrationVersion: kibanaVersion,
            typeMigrationVersion: '1.0.0',
            // there is no 'namespaces' field because no transforms were applied; this scenario is contrived for a clean test case but is not indicative of a real-world scenario
          },
        ]);
      });

      it('does not fail when encountering documents with coreMigrationVersion higher than the latest known', () => {
        const migrator = new DocumentMigrator({
          ...testOpts(),
          typeRegistry: createRegistry(
            { name: 'dog', namespaceType: 'multiple', convertToMultiNamespaceTypeVersion: '1.0.0' }
            // no migration transforms are defined, the typeMigrationVersion will be derived from 'convertToMultiNamespaceTypeVersion'
          ),
        });
        migrator.prepareMigrations();
        const obj = {
          id: 'mischievous',
          type: 'dog',
          attributes: { name: 'Ann' },
          coreMigrationVersion: '20.0.0',
          typeMigrationVersion: '0.1.0',
        } as SavedObjectUnsanitizedDoc;
        const actual = migrator.migrateAndConvert(obj);
        expect(actual).toEqual([
          {
            id: 'mischievous',
            type: 'dog',
            attributes: { name: 'Ann' },
            coreMigrationVersion: '20.0.0',
            typeMigrationVersion: '1.0.0',
            namespaces: ['default'],
          },
        ]);
      });

      it('skips reference transforms and conversion transforms when using `migrate`', () => {
        const migrator = new DocumentMigrator({
          ...testOpts(),
          typeRegistry: createRegistry(
            { name: 'dog', namespaceType: 'multiple', convertToMultiNamespaceTypeVersion: '8.8.0' },
            { name: 'toy', namespaceType: 'multiple', convertToMultiNamespaceTypeVersion: '8.8.0' }
          ),
        });
        migrator.prepareMigrations();
        const obj = {
          id: 'cowardly',
          type: 'dog',
          attributes: { name: 'Leslie' },
          references: [{ id: 'favorite', type: 'toy', name: 'BALL!' }],
          namespace: 'foo-namespace',
          coreMigrationVersion: '8.8.0',
          typeMigrationVersion: '',
        };
        const actual = migrator.migrate(obj);
        expect(mockGetConvertedObjectId).not.toHaveBeenCalled();
        expect(actual).toEqual({
          id: 'cowardly',
          type: 'dog',
          attributes: { name: 'Leslie' },
          references: [{ id: 'favorite', type: 'toy', name: 'BALL!' }],
          coreMigrationVersion: '8.8.0',
          typeMigrationVersion: '8.8.0',
          namespace: 'foo-namespace',
          // there is no 'namespaces' field because no conversion transform was applied; this scenario is contrived for a clean test case but is not indicative of a real-world scenario
        });
      });

      it('should keep the same `typeMigrationVersion` when the conversion transforms are skipped', () => {
        const migrator = new DocumentMigrator({
          ...testOpts(),
          typeRegistry: createRegistry({
            name: 'dog',
            namespaceType: 'multiple',
            convertToMultiNamespaceTypeVersion: '3.0.0',
            migrations: {
              '1.0.0': (doc: SavedObjectUnsanitizedDoc) => doc,
            },
          }),
        });
        migrator.prepareMigrations();
        const obj = {
          id: 'cowardly',
          type: 'dog',
          attributes: { name: 'Leslie' },
          coreMigrationVersion: '8.8.0',
          typeMigrationVersion: '2.0.0',
          references: [{ id: 'favorite', type: 'toy', name: 'BALL!' }],
          namespace: 'foo-namespace',
        };
        const actual = migrator.migrate(obj);
        expect(mockGetConvertedObjectId).not.toHaveBeenCalled();
        expect(actual).toEqual({
          id: 'cowardly',
          type: 'dog',
          attributes: { name: 'Leslie' },
          references: [{ id: 'favorite', type: 'toy', name: 'BALL!' }],
          coreMigrationVersion: '8.8.0',
          typeMigrationVersion: '2.0.0',
          namespace: 'foo-namespace',
          // there is no 'namespaces' field because no conversion transform was applied; this scenario is contrived for a clean test case but is not indicative of a real-world scenario
        });
      });

      describe('correctly applies core transforms', () => {
        const migrator = new DocumentMigrator({
          ...testOpts(),
          typeRegistry: createRegistry(
            {
              name: 'dog',
              namespaceType: 'single',
              migrations: { '1.0.0': (doc) => doc },
            },
            { name: 'toy', namespaceType: 'multiple' }
          ),
        });
        migrator.prepareMigrations();
        const obj = {
          id: 'bad',
          type: 'dog',
          attributes: { name: 'Sweet Peach' },
          migrationVersion: { dog: '1.0.0' },
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
              references: [{ id: 'favorite', type: 'toy', name: 'BALL!' }],
              coreMigrationVersion: '8.8.0',
              typeMigrationVersion: '1.0.0',
            },
          ]);
        });

        it('in a non-default space', () => {
          const actual = migrator.migrateAndConvert({ ...obj, namespace: 'foo-namespace' });
          expect(mockGetConvertedObjectId).not.toHaveBeenCalled();
          expect(actual).toEqual([
            {
              id: 'bad',
              type: 'dog',
              attributes: { name: 'Sweet Peach' },
              references: [{ id: 'favorite', type: 'toy', name: 'BALL!' }],
              coreMigrationVersion: '8.8.0',
              typeMigrationVersion: '1.0.0',
              namespace: 'foo-namespace',
            },
          ]);
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
          typeMigrationVersion: '',
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
              coreMigrationVersion: '8.8.0',
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
              coreMigrationVersion: '8.8.0',
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
          coreMigrationVersion: '8.8.0',
          typeMigrationVersion: '',
        };

        it('in the default space', () => {
          const actual = migrator.migrateAndConvert(obj);
          expect(mockGetConvertedObjectId).not.toHaveBeenCalled();
          expect(actual).toEqual([
            {
              id: 'loud',
              type: 'dog',
              attributes: { name: 'Wally' },
              coreMigrationVersion: '8.8.0',
              typeMigrationVersion: '1.0.0',
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
              coreMigrationVersion: '8.8.0',
              typeMigrationVersion: '1.0.0',
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
              coreMigrationVersion: '8.8.0',
              typeMigrationVersion: '0.1.2',
            },
          ]);
        });
      });

      describe('correctly applies core, reference, and conversion transforms', () => {
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
              references: [{ id: 'favorite', type: 'toy', name: 'BALL!' }], // no change
              coreMigrationVersion: '8.8.0',
              typeMigrationVersion: '1.0.0',
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
              references: [{ id: 'uuidv5', type: 'toy', name: 'BALL!' }], // changed
              coreMigrationVersion: '8.8.0',
              typeMigrationVersion: '1.0.0',
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
              coreMigrationVersion: '8.8.0',
              typeMigrationVersion: '0.1.2',
            },
          ]);
        });
      });

      describe('correctly applies core, reference, and migration transforms', () => {
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
              references: [{ id: 'favorite', type: 'toy', name: 'BALL!' }], // no change
              coreMigrationVersion: '8.8.0',
              typeMigrationVersion: '2.0.0',
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
              references: [{ id: 'uuidv5', type: 'toy', name: 'BALL!' }], // changed
              coreMigrationVersion: '8.8.0',
              typeMigrationVersion: '2.0.0',
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
              '1.0.0': setAttr('typeMigrationVersion', '2.0.0'),
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
          coreMigrationVersion: '8.8.0',
          typeMigrationVersion: '',
        };

        it('in the default space', () => {
          const actual = migrator.migrateAndConvert(obj);
          expect(mockGetConvertedObjectId).not.toHaveBeenCalled();
          expect(actual).toEqual([
            {
              id: 'hungry',
              type: 'dog',
              attributes: { name: 'Remy' },
              coreMigrationVersion: '8.8.0',
              typeMigrationVersion: '2.0.0',
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
              coreMigrationVersion: '8.8.0',
              typeMigrationVersion: '2.0.0',
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
              coreMigrationVersion: '8.8.0',
              typeMigrationVersion: '0.1.2',
            },
          ]);
        });
      });

      describe('correctly applies core, reference, conversion, and migration transforms', () => {
        const migrator = new DocumentMigrator({
          ...testOpts(),
          typeRegistry: createRegistry(
            {
              name: 'dog',
              namespaceType: 'multiple',
              migrations: {
                '1.0.0': setAttr('typeMigrationVersion', '2.0.0'),
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
              references: [{ id: 'favorite', type: 'toy', name: 'BALL!' }], // no change
              coreMigrationVersion: '8.8.0',
              typeMigrationVersion: '2.0.0',
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
              references: [{ id: 'uuidv5', type: 'toy', name: 'BALL!' }], // changed
              coreMigrationVersion: '8.8.0',
              typeMigrationVersion: '2.0.0',
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
              coreMigrationVersion: '8.8.0',
              typeMigrationVersion: '0.1.2',
            },
          ]);
        });
      });
    });

    describe('`typeMigrationVersion` core migration', () => {
      let migrator: DocumentMigrator;
      let noop: jest.MockedFunction<(doc: SavedObjectUnsanitizedDoc) => SavedObjectUnsanitizedDoc>;

      beforeEach(() => {
        noop = jest.fn((doc) => doc);
        migrator = new DocumentMigrator({
          ...testOpts(),
          typeRegistry: createRegistry({
            name: 'dog',
            migrations: {
              '1.0.0': noop,
            },
          }),
        });
        migrator.prepareMigrations();
      });

      it('migrates to `typeMigrationVersion`', () => {
        const actual = migrator.migrate({
          id: 'smelly',
          type: 'dog',
          attributes: {},
          migrationVersion: { dog: '1.0.0' },
        });
        expect(actual).toHaveProperty('typeMigrationVersion', '1.0.0');
      });

      it('ignores unrelated versions', () => {
        const actual = migrator.migrate({
          id: 'smelly',
          type: 'dog',
          attributes: {},
          migrationVersion: {
            dog: '1.0.0',
            cat: '2.0.0',
          },
        });
        expect(actual).toHaveProperty('typeMigrationVersion', '1.0.0');
      });

      it('removes `migrationVersion` property', () => {
        const actual = migrator.migrate({
          id: 'smelly',
          type: 'dog',
          attributes: {},
          migrationVersion: {
            dog: '1.0.0',
            cat: '2.0.0',
          },
        });
        expect(actual).not.toHaveProperty('migrationVersion');
      });

      it('migrates to the latest on missing version', () => {
        const actual = migrator.migrate({
          id: 'smelly',
          type: 'dog',
          attributes: {},
          migrationVersion: {},
          coreMigrationVersion: '8.7.0',
        });
        expect(noop).toHaveBeenCalledWith(
          expect.objectContaining({ typeMigrationVersion: '' }),
          expect.anything()
        );
        expect(actual).toHaveProperty('typeMigrationVersion', '1.0.0');
      });

      it('does not migrate if there is no `migrationVersion`', () => {
        const actual = migrator.migrate({
          id: 'smelly',
          type: 'dog',
          attributes: {},
          coreMigrationVersion: '8.7.0',
        });
        expect(noop).not.toHaveBeenCalled();
        expect(actual).toHaveProperty('coreMigrationVersion', '8.8.0');
        expect(actual).toHaveProperty('typeMigrationVersion', '1.0.0');
        expect(actual).not.toHaveProperty('migrationVersion');
      });

      it('does not add `typeMigrationVersion` if there are no migrations', () => {
        migrator = new DocumentMigrator({
          ...testOpts(),
          typeRegistry: createRegistry({
            name: 'dog',
          }),
        });
        migrator.prepareMigrations();

        const actual = migrator.migrate({
          id: 'smelly',
          type: 'dog',
          attributes: {},
          coreMigrationVersion: '8.7.0',
        });
        expect(noop).not.toHaveBeenCalled();
        expect(actual).toHaveProperty('coreMigrationVersion', '8.8.0');
        expect(actual).not.toHaveProperty('typeMigrationVersion');
        expect(actual).not.toHaveProperty('migrationVersion');
      });
    });
  });

  describe('down transformation', () => {
    let migrator: DocumentMigrator;
    let transforms: Record<number, jest.MockedFunction<SavedObjectModelTransformationFn<any>>>;

    const createTransformFn = (
      impl?: SavedObjectModelTransformationFn<any>
    ): jest.MockedFunction<SavedObjectModelTransformationFn<any>> => {
      const defaultImpl: SavedObjectModelTransformationFn = (doc) => ({
        document: doc,
      });
      return jest.fn().mockImplementation(impl ?? defaultImpl);
    };

    const transformCall = (num: number) => transforms[num].mock.invocationCallOrder[0];

    beforeEach(() => {
      const migrate1 = createTransformFn((doc) => {
        doc.attributes.wentThoughDown1 = true;
        return { document: doc };
      });
      const migrate2 = createTransformFn((doc) => {
        doc.attributes.wentThoughDown2 = true;
        return { document: doc };
      });
      const migrate3 = createTransformFn((doc) => {
        doc.attributes.wentThoughDown3 = true;
        return { document: doc };
      });

      transforms = {
        1: migrate1,
        2: migrate2,
        3: migrate3,
      };

      migrator = new DocumentMigrator({
        ...testOpts(),
        typeRegistry: createRegistry({
          name: 'down-test',
          migrations: {
            '7.8.0': jest.fn(),
            '7.9.0': jest.fn(),
          },
          switchToModelVersionAt: '8.0.0',
          modelVersions: {
            1: {
              modelChange: {
                type: 'expansion',
                transformation: { up: jest.fn(), down: migrate1 },
              },
            },
            2: {
              modelChange: {
                type: 'expansion',
                transformation: { up: jest.fn(), down: migrate2 },
              },
            },
            3: {
              modelChange: {
                type: 'expansion',
                transformation: { up: jest.fn(), down: migrate3 },
              },
            },
          },
        }),
      });
      migrator.prepareMigrations();
    });

    it('applies the expected conversion', () => {
      const document = createDoc({
        type: 'down-test',
        typeMigrationVersion: modelVersionToVirtualVersion(2),
      });

      const result = migrator.transformDown(document, {
        targetTypeVersion: modelVersionToVirtualVersion(1),
      });

      expect(result.typeMigrationVersion).toEqual(modelVersionToVirtualVersion(1));
      expect(result.attributes).toEqual({
        wentThoughDown2: true,
      });
    });

    it('applies all the expected conversions', () => {
      const document = createDoc({
        type: 'down-test',
        typeMigrationVersion: modelVersionToVirtualVersion(3),
      });

      const result = migrator.transformDown(document, {
        targetTypeVersion: modelVersionToVirtualVersion(0),
      });

      expect(result.typeMigrationVersion).toEqual(modelVersionToVirtualVersion(0));
      expect(result.attributes).toEqual({
        wentThoughDown1: true,
        wentThoughDown2: true,
        wentThoughDown3: true,
      });
    });

    it('applies the conversions in order', () => {
      const document = createDoc({
        type: 'down-test',
        typeMigrationVersion: modelVersionToVirtualVersion(3),
      });

      const result = migrator.transformDown(document, {
        targetTypeVersion: modelVersionToVirtualVersion(0),
      });

      expect(result.typeMigrationVersion).toEqual(modelVersionToVirtualVersion(0));

      expect(transforms[1]).toHaveBeenCalledTimes(1);
      expect(transforms[2]).toHaveBeenCalledTimes(1);
      expect(transforms[3]).toHaveBeenCalledTimes(1);

      expect(transformCall(3)).toBeLessThan(transformCall(2));
      expect(transformCall(2)).toBeLessThan(transformCall(1));
    });

    it('throw when trying to transform to a higher version', () => {
      const document = createDoc({
        type: 'down-test',
        typeMigrationVersion: modelVersionToVirtualVersion(2),
      });

      expect(() =>
        migrator.transformDown(document, {
          targetTypeVersion: modelVersionToVirtualVersion(3),
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Trying to transform down to a higher version: 10.2.0 to 10.3.0"`
      );
    });

    it('throw when trying to transform a document from a higher version than the max one', () => {
      const document = createDoc({
        type: 'down-test',
        typeMigrationVersion: modelVersionToVirtualVersion(4),
      });

      expect(() =>
        migrator.transformDown(document, {
          targetTypeVersion: modelVersionToVirtualVersion(2),
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Document \\"test-doc\\" belongs to a more recent version of Kibana [10.4.0] when the last known version is [10.3.0]."`
      );
    });

    it('throw when trying to transform to a version without down conversion', () => {
      const document = createDoc({
        type: 'down-test',
        typeMigrationVersion: modelVersionToVirtualVersion(2),
      });

      expect(() =>
        migrator.transformDown(document, {
          targetTypeVersion: '7.8.0',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Could not apply transformation migrate:7.9.0: no down conversion registered"`
      );
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
