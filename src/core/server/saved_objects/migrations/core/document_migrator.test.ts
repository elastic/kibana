/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import { RawSavedObjectDoc } from '../../serialization';
import { DocumentMigrator } from './document_migrator';
import { loggingServiceMock } from '../../../logging/logging_service.mock';

const mockLoggerFactory = loggingServiceMock.create();
const mockLogger = mockLoggerFactory.get('mock logger');

describe('DocumentMigrator', () => {
  function testOpts() {
    return {
      kibanaVersion: '25.2.3',
      migrations: {},
      validateDoc: _.noop,
      log: mockLogger,
    };
  }

  it('validates the migration definition', () => {
    const invalidDefinition: any = {
      kibanaVersion: '3.2.3',
      migrations: 'hello',
      validateDoc: _.noop,
    };
    expect(() => new DocumentMigrator(invalidDefinition)).toThrow(
      /Migration definition should be an object/i
    );
  });

  it('validates individual migration definitions', () => {
    const invalidDefinition: any = {
      kibanaVersion: '3.2.3',
      migrations: {
        foo: _.noop,
      },
      validateDoc: _.noop,
    };
    expect(() => new DocumentMigrator(invalidDefinition)).toThrow(
      /Migration for type foo should be an object/i
    );
  });

  it('validates individual migration semvers', () => {
    const invalidDefinition: any = {
      kibanaVersion: '3.2.3',
      migrations: {
        foo: {
          bar: _.noop,
        },
      },
      validateDoc: _.noop,
    };
    expect(() => new DocumentMigrator(invalidDefinition)).toThrow(
      /Expected all properties to be semvers/i
    );
  });

  it('validates the migration function', () => {
    const invalidDefinition: any = {
      kibanaVersion: '3.2.3',
      migrations: {
        foo: {
          '1.2.3': 23,
        },
      },
      validateDoc: _.noop,
    };
    expect(() => new DocumentMigrator(invalidDefinition)).toThrow(
      /expected a function, but got 23/i
    );
  });

  it('migrates type and attributes', () => {
    const migrator = new DocumentMigrator({
      ...testOpts(),
      migrations: {
        user: {
          '1.2.3': setAttr('attributes.name', 'Chris'),
        },
      },
    });
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
    });
  });

  it(`doesn't mutate the original document`, () => {
    const migrator = new DocumentMigrator({
      ...testOpts(),
      migrations: {
        user: {
          '1.2.3': (doc: RawSavedObjectDoc) => {
            _.set(doc, 'attributes.name', 'Mike');
            return doc;
          },
        },
      },
    });
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

  it('migrates meta properties', () => {
    const migrator = new DocumentMigrator({
      ...testOpts(),
      migrations: {
        acl: {
          '2.3.5': setAttr('acl', 'admins-only,sucka!'),
        },
      },
    });
    const actual = migrator.migrate({
      id: 'me',
      type: 'user',
      attributes: { name: 'Tyler' },
      acl: 'anyone',
      migrationVersion: {},
    });
    expect(actual).toEqual({
      id: 'me',
      type: 'user',
      attributes: { name: 'Tyler' },
      migrationVersion: { acl: '2.3.5' },
      acl: 'admins-only,sucka!',
    });
  });

  it('does not apply migrations to unrelated docs', () => {
    const migrator = new DocumentMigrator({
      ...testOpts(),
      migrations: {
        aaa: { '1.0.0': setAttr('aaa', 'A') },
        bbb: { '1.0.0': setAttr('bbb', 'B') },
        ccc: { '1.0.0': setAttr('ccc', 'C') },
      },
    });
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
    });
  });

  it('assumes documents w/ undefined migrationVersion are up to date', () => {
    const migrator = new DocumentMigrator({
      ...testOpts(),
      migrations: {
        user: { '1.0.0': setAttr('aaa', 'A') },
        bbb: { '2.3.4': setAttr('bbb', 'B') },
        ccc: { '1.0.0': setAttr('ccc', 'C') },
      },
    });
    const actual = migrator.migrate({
      id: 'me',
      type: 'user',
      attributes: { name: 'Tyler' },
      bbb: 'Shazm',
    });
    expect(actual).toEqual({
      id: 'me',
      type: 'user',
      attributes: { name: 'Tyler' },
      bbb: 'Shazm',
      migrationVersion: {
        user: '1.0.0',
        bbb: '2.3.4',
      },
    });
  });

  it('only applies migrations that are more recent than the doc', () => {
    const migrator = new DocumentMigrator({
      ...testOpts(),
      migrations: {
        dog: {
          '1.2.3': setAttr('attributes.a', 'A'),
          '1.2.4': setAttr('attributes.b', 'B'),
          '2.0.1': setAttr('attributes.c', 'C'),
        },
      },
    });
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
    });
  });

  it('rejects docs that belong to a newer Kibana instance', () => {
    const migrator = new DocumentMigrator({
      ...testOpts(),
      kibanaVersion: '8.0.1',
    });
    expect(() =>
      migrator.migrate({
        id: 'smelly',
        type: 'dog',
        attributes: { name: 'Callie' },
        migrationVersion: { dog: '10.2.0' },
      })
    ).toThrow(
      /Document "smelly" has property "dog" which belongs to a more recent version of Kibana \(10\.2\.0\)/i
    );
  });

  it('rejects docs that belong to a newer plugin', () => {
    const migrator = new DocumentMigrator({
      ...testOpts(),
      migrations: {
        dawg: {
          '1.2.3': setAttr('attributes.a', 'A'),
        },
      },
    });
    expect(() =>
      migrator.migrate({
        id: 'fleabag',
        type: 'dawg',
        attributes: { name: 'Callie' },
        migrationVersion: { dawg: '1.2.4' },
      })
    ).toThrow(
      /Document "fleabag" has property "dawg" which belongs to a more recent version of Kibana \(1\.2\.4\)/i
    );
  });

  it('applies migrations in order', () => {
    let count = 0;
    const migrator = new DocumentMigrator({
      ...testOpts(),
      migrations: {
        dog: {
          '2.2.4': setAttr('attributes.b', () => ++count),
          '10.0.1': setAttr('attributes.c', () => ++count),
          '1.2.3': setAttr('attributes.a', () => ++count),
        },
      },
    });
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
    });
  });

  it('allows props to be added', () => {
    const migrator = new DocumentMigrator({
      ...testOpts(),
      migrations: {
        animal: {
          '1.0.0': setAttr('animal', (name: string) => `Animal: ${name}`),
        },
        dog: {
          '2.2.4': setAttr('animal', 'Doggie'),
        },
      },
    });
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
    });
  });

  it('allows props to be renamed', () => {
    const migrator = new DocumentMigrator({
      ...testOpts(),
      migrations: {
        animal: {
          '1.0.0': setAttr('animal', (name: string) => `Animal: ${name}`),
          '3.2.1': renameAttr('animal', 'dawg'),
        },
        dawg: {
          '2.2.4': renameAttr('dawg', 'animal'),
          '3.2.0': setAttr('dawg', (name: string) => `Dawg3.x: ${name}`),
        },
      },
    });
    const actual = migrator.migrate({
      id: 'smelly',
      type: 'foo',
      attributes: { name: 'Callie' },
      dawg: 'Yo',
      migrationVersion: {},
    });
    expect(actual).toEqual({
      id: 'smelly',
      type: 'foo',
      attributes: { name: 'Callie' },
      dawg: 'Dawg3.x: Animal: Yo',
      migrationVersion: { animal: '3.2.1', dawg: '3.2.0' },
    });
  });

  it('allows changing type', () => {
    const migrator = new DocumentMigrator({
      ...testOpts(),
      migrations: {
        cat: {
          '1.0.0': setAttr('attributes.name', (name: string) => `Kitty ${name}`),
        },
        dog: {
          '2.2.4': setAttr('type', 'cat'),
        },
      },
    });
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
    });
  });

  it('disallows updating a migrationVersion prop to a lower version', () => {
    const migrator = new DocumentMigrator({
      ...testOpts(),
      migrations: {
        cat: {
          '1.0.0': setAttr('migrationVersion.foo', '3.2.1'),
        },
      },
    });

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
      migrations: {
        cat: {
          '1.0.0': setAttr('migrationVersion', {}),
        },
      },
    });
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

  it('allows updating a migrationVersion prop to a later version', () => {
    const migrator = new DocumentMigrator({
      ...testOpts(),
      migrations: {
        cat: {
          '1.0.0': setAttr('migrationVersion.cat', '2.9.1'),
          '2.0.0': () => {
            throw new Error('POW!');
          },
          '2.9.1': () => {
            throw new Error('BANG!');
          },
          '3.0.0': setAttr('attributes.name', 'Shiny'),
        },
      },
    });
    const actual = migrator.migrate({
      id: 'smelly',
      type: 'cat',
      attributes: { name: 'Boo' },
      migrationVersion: { cat: '0.5.6' },
    });
    expect(actual).toEqual({
      id: 'smelly',
      type: 'cat',
      attributes: { name: 'Shiny' },
      migrationVersion: { cat: '3.0.0' },
    });
  });

  it('allows adding props to migrationVersion', () => {
    const migrator = new DocumentMigrator({
      ...testOpts(),
      migrations: {
        cat: {
          '1.0.0': setAttr('migrationVersion.foo', '5.6.7'),
        },
      },
    });
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
    });
  });

  it('logs the document and transform that failed', () => {
    const log = mockLogger;
    const migrator = new DocumentMigrator({
      ...testOpts(),
      migrations: {
        dog: {
          '1.2.3': () => {
            throw new Error('Dang diggity!');
          },
        },
      },
      log,
    });
    const failedDoc = {
      id: 'smelly',
      type: 'dog',
      attributes: {},
      migrationVersion: {},
    };
    try {
      migrator.migrate(_.cloneDeep(failedDoc));
      expect('Did not throw').toEqual('But it should have!');
    } catch (error) {
      expect(error.message).toMatch(/Dang diggity!/);
      const warning = loggingServiceMock.collect(mockLoggerFactory).warn[0][0];
      expect(warning).toContain(JSON.stringify(failedDoc));
      expect(warning).toContain('dog:1.2.3');
    }
  });

  it('logs message in transform function', () => {
    const logTestMsg = '...said the joker to the thief';
    const migrator = new DocumentMigrator({
      ...testOpts(),
      migrations: {
        dog: {
          '1.2.3': (doc, log) => {
            log.info(logTestMsg);
            log.warning(logTestMsg);
            return doc;
          },
        },
      },
      log: mockLogger,
    });
    const doc = {
      id: 'joker',
      type: 'dog',
      attributes: {},
      migrationVersion: {},
    };
    migrator.migrate(doc);
    expect(loggingServiceMock.collect(mockLoggerFactory).info[0][0]).toEqual(logTestMsg);
    expect(loggingServiceMock.collect(mockLoggerFactory).warn[1][0]).toEqual(logTestMsg);
  });

  test('extracts the latest migration version info', () => {
    const { migrationVersion } = new DocumentMigrator({
      ...testOpts(),
      migrations: {
        aaa: {
          '1.2.3': (doc: RawSavedObjectDoc) => doc,
          '10.4.0': (doc: RawSavedObjectDoc) => doc,
          '2.2.1': (doc: RawSavedObjectDoc) => doc,
        },
        bbb: {
          '3.2.3': (doc: RawSavedObjectDoc) => doc,
          '2.0.0': (doc: RawSavedObjectDoc) => doc,
        },
      },
    });

    expect(migrationVersion).toEqual({
      aaa: '10.4.0',
      bbb: '3.2.3',
    });
  });

  test('fails if the validate doc throws', () => {
    const migrator = new DocumentMigrator({
      ...testOpts(),
      migrations: {
        aaa: {
          '2.3.4': d => _.set(d, 'attributes.counter', 42),
        },
      },
      validateDoc: d => {
        if ((d.attributes as any).counter === 42) {
          throw new Error('Meaningful!');
        }
      },
    });

    const doc = { id: '1', type: 'foo', attributes: {}, migrationVersion: {}, aaa: {} };

    expect(() => migrator.migrate(doc)).toThrow(/Meaningful/);
  });
});

function renameAttr(path: string, newPath: string) {
  return (doc: RawSavedObjectDoc) =>
    _.omit(_.set(doc, newPath, _.get(doc, path)) as {}, path) as RawSavedObjectDoc;
}

function setAttr(path: string, value: any) {
  return (doc: RawSavedObjectDoc) =>
    _.set(doc, path, _.isFunction(value) ? value(_.get(doc, path)) : value) as RawSavedObjectDoc;
}
