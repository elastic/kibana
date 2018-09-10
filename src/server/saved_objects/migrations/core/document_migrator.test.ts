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
import { DocumentMigrator, SavedObjectDoc } from './document_migrator';

describe('DocumentMigrator', () => {
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
    const kibanaVersion = '8.9.1';
    const migrator = new DocumentMigrator({
      kibanaVersion,
      migrations: {
        user: {
          '1.2.3': setAttr('attributes.name', 'Chris'),
        },
      },
      validateDoc: _.noop,
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

  it('migrates meta properties', () => {
    const kibanaVersion = '8.9.1';
    const migrator = new DocumentMigrator({
      kibanaVersion,
      migrations: {
        acl: {
          '2.3.5': setAttr('acl', 'admins-only,sucka!'),
        },
      },
      validateDoc: _.noop,
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
    const kibanaVersion = '8.9.1';
    const migrator = new DocumentMigrator({
      kibanaVersion,
      migrations: {
        aaa: { '1.0.0': setAttr('aaa', 'A') },
        bbb: { '1.0.0': setAttr('bbb', 'B') },
        ccc: { '1.0.0': setAttr('ccc', 'C') },
      },
      validateDoc: _.noop,
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
    const kibanaVersion = '8.9.1';
    const migrator = new DocumentMigrator({
      kibanaVersion,
      migrations: {
        user: { '1.0.0': setAttr('aaa', 'A') },
        bbb: { '2.3.4': setAttr('bbb', 'B') },
        ccc: { '1.0.0': setAttr('ccc', 'C') },
      },
      validateDoc: _.noop,
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
    const kibanaVersion = '8.9.1';
    const migrator = new DocumentMigrator({
      kibanaVersion,
      migrations: {
        dog: {
          '1.2.3': setAttr('attributes.a', 'A'),
          '1.2.4': setAttr('attributes.b', 'B'),
          '2.0.1': setAttr('attributes.c', 'C'),
        },
      },
      validateDoc: _.noop,
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
    const kibanaVersion = '8.9.1';
    const migrations = {};
    const migrator = new DocumentMigrator({ kibanaVersion, migrations, validateDoc: _.noop });
    expect(() =>
      migrator.migrate({
        id: 'smelly',
        type: 'dog',
        attributes: { name: 'Callie' },
        migrationVersion: { dog: '10.2.0' },
      })
    ).toThrow(/belongs to a more recent version of Kibana \(10\.2\.0\)/);
  });

  it('applies migrations in order', () => {
    const kibanaVersion = '18.9.1';
    let count = 0;
    const migrator = new DocumentMigrator({
      kibanaVersion,
      migrations: {
        dog: {
          '2.2.4': setAttr('attributes.b', () => ++count),
          '10.0.1': setAttr('attributes.c', () => ++count),
          '1.2.3': setAttr('attributes.a', () => ++count),
        },
      },
      validateDoc: _.noop,
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
    const kibanaVersion = '18.9.1';
    const migrator = new DocumentMigrator({
      kibanaVersion,
      migrations: {
        animal: {
          '1.0.0': setAttr('animal', (name: string) => `Animal: ${name}`),
        },
        dog: {
          '2.2.4': setAttr('animal', 'Doggie'),
        },
      },
      validateDoc: _.noop,
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
    const kibanaVersion = '18.9.1';
    const migrator = new DocumentMigrator({
      kibanaVersion,
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
      validateDoc: _.noop,
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
    const kibanaVersion = '18.9.1';
    const migrator = new DocumentMigrator({
      kibanaVersion,
      migrations: {
        cat: {
          '1.0.0': setAttr('attributes.name', (name: string) => `Kitty ${name}`),
        },
        dog: {
          '2.2.4': setAttr('type', 'cat'),
        },
      },
      validateDoc: _.noop,
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
    const kibanaVersion = '18.9.1';
    const migrator = new DocumentMigrator({
      kibanaVersion,
      migrations: {
        cat: {
          '1.0.0': setAttr('migrationVersion.foo', '3.2.1'),
        },
      },
      validateDoc: _.noop,
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
    const kibanaVersion = '18.9.1';
    const migrator = new DocumentMigrator({
      kibanaVersion,
      migrations: {
        cat: {
          '1.0.0': setAttr('migrationVersion', {}),
        },
      },
      validateDoc: _.noop,
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
    const kibanaVersion = '18.9.1';
    const migrator = new DocumentMigrator({
      kibanaVersion,
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
      validateDoc: _.noop,
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
    const kibanaVersion = '18.9.1';
    const migrator = new DocumentMigrator({
      kibanaVersion,
      migrations: {
        cat: {
          '1.0.0': setAttr('migrationVersion.foo', '5.6.7'),
        },
      },
      validateDoc: _.noop,
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

  it('decorates transform errors with details about what doc and transform failed', () => {
    const kibanaVersion = '8.9.1';
    const migrator = new DocumentMigrator({
      kibanaVersion,
      migrations: {
        dog: {
          '1.2.3': () => {
            throw new Error('Dang diggity!');
          },
        },
      },
      validateDoc: _.noop,
    });
    try {
      migrator.migrate({
        id: 'smelly',
        type: 'dog',
        attributes: {},
        migrationVersion: {},
      });
      expect('Did not throw').toEqual('But it should have!');
    } catch (error) {
      expect(error.message).toMatch(/Dang diggity!/);
      expect(error.detail).toEqual({
        failedDoc: 'dog:smelly',
        failedTransform: 'dog:1.2.3',
      });
    }
  });

  test('extracts the latest migration version info', () => {
    const kibanaVersion = '9.3.1';
    const { migrationVersion } = new DocumentMigrator({
      kibanaVersion,
      migrations: {
        aaa: {
          '1.2.3': (doc: SavedObjectDoc) => doc,
          '10.4.0': (doc: SavedObjectDoc) => doc,
          '2.2.1': (doc: SavedObjectDoc) => doc,
        },
        bbb: {
          '3.2.3': (doc: SavedObjectDoc) => doc,
          '2.0.0': (doc: SavedObjectDoc) => doc,
        },
      },
      validateDoc: _.noop,
    });

    expect(migrationVersion).toEqual({
      aaa: '10.4.0',
      bbb: '3.2.3',
    });
  });

  test('fails if the validate doc throws', () => {
    const kibanaVersion = '9.3.1';
    const migrator = new DocumentMigrator({
      kibanaVersion,
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
  return (doc: SavedObjectDoc) =>
    _.omit(_.set(doc, newPath, _.get(doc, path)), path) as SavedObjectDoc;
}

function setAttr(path: string, value: any) {
  return (doc: SavedObjectDoc) =>
    _.set(doc, path, _.isFunction(value) ? value(_.get(doc, path)) : value) as SavedObjectDoc;
}
