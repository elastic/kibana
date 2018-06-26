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
import sinon from 'sinon';
import { buildTransformFunction } from './build_transform_function';
import { SavedObjectDoc } from './types';

describe('buildTransformFunction', () => {
  const book = {
    attributes: {
      title: 'I Am America And So Can You',
    },
    id: 'bar',
    migrationVersion: '2.3.4',
    type: 'book',
  };

  test('applies transforms to the doc', () => {
    const transform = buildTransformFunction([
      {
        id: 'bookish',
        migrations: {
          book: {
            '2.3.5': setAttribute('author', 'Stephen Colbert'),
            '3.0.0': setAttribute('year', '2007'),
          },
        },
      },
    ]);

    expect(transform(_.cloneDeep(book))).toEqual({
      attributes: {
        author: 'Stephen Colbert',
        title: 'I Am America And So Can You',
        year: '2007',
      },
      id: 'bar',
      migrationVersion: '3.0.0',
      type: 'book',
    });
  });

  test('applies transforms in semver order', () => {
    const incCounter = (expectedValue?: number) => (d: SavedObjectDoc) => {
      expect(d.attributes.count).toEqual(expectedValue);
      const doc = _.set(d, 'attributes.count', (expectedValue || 0) + 1);
      return doc as SavedObjectDoc;
    };

    const transform = buildTransformFunction([
      {
        id: 'whatevz',
        migrations: {
          book: {
            '2.3.5': incCounter(undefined),
            '20.0.0': incCounter(2),
            '3.0.1': incCounter(1),
          },
        },
      },
    ]);

    expect(transform(_.cloneDeep(book))).toEqual({
      attributes: {
        count: 3,
        title: 'I Am America And So Can You',
      },
      id: 'bar',
      migrationVersion: '20.0.0',
      type: 'book',
    });
  });

  test('applies only transforms that match the doc type', () => {
    const spy = sinon.spy();

    const transform = buildTransformFunction([
      {
        id: 'bookish',
        migrations: {
          book: {
            '2.3.5': setAttribute('author', 'Stephen Colbert'),
          },
          cook: {
            '2.3.5': spy,
          },
        },
      },
    ]);

    expect(transform(_.cloneDeep(book))).toEqual({
      attributes: {
        author: 'Stephen Colbert',
        title: 'I Am America And So Can You',
      },
      id: 'bar',
      migrationVersion: '2.3.5',
      type: 'book',
    });

    expect(spy.notCalled).toBeTruthy();
  });

  test(`applies only transforms whose semvers are greater than the doc's`, () => {
    const transform = buildTransformFunction([
      {
        id: 'bookish',
        migrations: {
          book: {
            '2.3.4': setAttribute('author', 'Stephen Colbert'),
            '3.0.0': setAttribute('year', '2007'),
          },
        },
      },
    ]);

    expect(transform(_.cloneDeep(book))).toEqual({
      attributes: {
        title: 'I Am America And So Can You',
        year: '2007',
      },
      id: 'bar',
      migrationVersion: '3.0.0',
      type: 'book',
    });
  });

  test('passes current documents through untouched', () => {
    const transform = buildTransformFunction([
      {
        id: 'bookish',
        migrations: {
          book: {
            '2.3.4': () => {
              throw new Error('DANG!');
            },
          },
        },
      },
    ]);

    const doc = _.cloneDeep(book);
    const transformed = transform(doc);

    expect(doc === transformed).toBeTruthy();
    expect(transformed).toEqual(book);
  });

  test(`allows changing the document's type and applies both type transforms`, () => {
    const transform = buildTransformFunction([
      {
        id: 'bookish',
        migrations: {
          book: {
            '3.0.5': (doc: SavedObjectDoc) => ({
              ...doc,
              type: 'work',
            }),
          },
        },
      },
      {
        id: 'workish',
        migrations: {
          work: {
            '3.0.5': () => {
              throw new Error('Dern!');
            },
            '3.0.6': setAttribute('genre', 'satire'),
          },
        },
      },
    ]);

    expect(transform(_.cloneDeep(book))).toEqual({
      attributes: {
        genre: 'satire',
        title: 'I Am America And So Can You',
      },
      id: 'bar',
      migrationVersion: '3.0.6',
      type: 'work',
    });
  });

  test('unversioned documents receive all transforms for their type', () => {
    const transform = buildTransformFunction([
      {
        id: 'bookish',
        migrations: {
          book: {
            '0.0.5': setAttribute('author', 'Stephen Colbert'),
            '2.0.1': setAttribute('year', '2007'),
          },
        },
      },
    ]);

    const doc = _.set<SavedObjectDoc>(
      _.cloneDeep(book),
      'migrationVersion',
      undefined
    );

    expect(transform(doc)).toEqual({
      attributes: {
        author: 'Stephen Colbert',
        title: 'I Am America And So Can You',
        year: '2007',
      },
      id: 'bar',
      migrationVersion: '2.0.1',
      type: 'book',
    });
  });

  test('handles plugins that have no migrations', () => {
    const transform = buildTransformFunction([
      { id: 'bookish' },
      { id: 'tookish' },
    ]);

    expect(transform(_.cloneDeep(book))).toEqual(book);
  });

  test('decorates errors with the plugin id, doc id, and transform version', () => {
    const transform = buildTransformFunction([
      {
        id: 'bookish',
        migrations: {
          book: {
            '5.3.4': () => {
              throw new Error('SHAZM!');
            },
          },
        },
      },
    ]);

    try {
      transform(_.cloneDeep(book));
      throw new Error('Should have thrown!');
    } catch (error) {
      expect(error.message).toMatch(/SHAZM/);
      expect(error.transform).toEqual({
        docId: 'bar',
        pluginId: 'bookish',
        type: 'book',
        version: '5.3.4',
      });
    }
  });
});

function setAttribute(attribute: string, value: any) {
  return (doc: SavedObjectDoc) =>
    _.set<SavedObjectDoc>(doc, ['attributes', attribute], value);
}
