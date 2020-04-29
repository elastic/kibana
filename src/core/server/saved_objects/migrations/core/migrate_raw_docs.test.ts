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
import { SavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { SavedObjectsSerializer } from '../../serialization';
import { migrateRawDocs } from './migrate_raw_docs';
import { createSavedObjectsMigrationLoggerMock } from '../../migrations/mocks';

describe('migrateRawDocs', () => {
  it('deserializes raw docs to saved objects before applying transform and serializing results to raw docs', async () => {
    const transform = jest.fn<any, any>((doc: any) => _.set(doc, 'attributes.name', 'HOI!'));
    const result = migrateRawDocs(
      new SavedObjectsSerializer(new SavedObjectTypeRegistry()),
      transform,
      [
        { _id: 'a:b', _source: { type: 'a', a: { name: 'AAA' } } },
        { _id: 'c:d', _source: { type: 'c', c: { name: 'DDD' } } },
      ],
      createSavedObjectsMigrationLoggerMock(),
      '7.0.0-test'
    );

    expect(result).toEqual([
      {
        _id: 'a:b',
        _source: {
          type: 'a',
          a: { name: 'HOI!' },
          migrationVersion: {},
          references: [],
          status: 'valid',
        },
      },
      {
        _id: 'c:d',
        _source: {
          type: 'c',
          c: { name: 'HOI!' },
          migrationVersion: {},
          references: [],
          status: 'valid',
        },
      },
    ]);

    expect(transform).toHaveBeenCalled();
  });

  it('if the transform function throws it serializes the raw doc as invalid', () => {
    const throwsOnTypeATransform = jest.fn<any, any>((doc: any) => {
      if (doc.type === 'a') throw new Error("type 'a' transform exception");
      else return _.set(doc, 'attributes.name', 'HOI!');
    });
    const result = migrateRawDocs(
      new SavedObjectsSerializer(new SavedObjectTypeRegistry()),
      throwsOnTypeATransform,
      [
        { _id: 'a:b', _source: { type: 'a', a: { name: 'AAA' } } },
        { _id: 'c:d', _source: { type: 'c', c: { name: 'DDD' } } },
      ],
      createSavedObjectsMigrationLoggerMock(),
      '7.0.0-test'
    );

    expect(result).toEqual([
      {
        _id: 'a:b',
        _source: {
          type: 'a',
          unsafe_properties: { a: { name: 'AAA' } },
          migrationVersion: {
            '_invalid:a': '7.0.0-test',
          },
          status: 'invalid',
        },
      },
      {
        _id: 'c:d',
        _source: {
          type: 'c',
          c: { name: 'HOI!' },
          migrationVersion: {},
          references: [],
          status: 'valid',
        },
      },
    ]);

    expect(throwsOnTypeATransform).toHaveBeenCalled();
  });

  it('if isRawSavedObject=false it skips the transform and serializes the raw doc as corrupt', async () => {
    const logger = createSavedObjectsMigrationLoggerMock();
    const transform = jest.fn<any, any>((doc: any) =>
      _.set(_.cloneDeep(doc), 'attributes.name', 'TADA')
    );
    const result = migrateRawDocs(
      new SavedObjectsSerializer(new SavedObjectTypeRegistry()),
      transform,
      [
        { _id: 'foo:b', _source: { type: 'a', a: { name: 'AAA' } } },
        { _id: 'c:d', _source: { type: 'c', c: { name: 'DDD' } } },
      ],
      logger,
      '7.0.0-test'
    );

    expect(result).toEqual([
      {
        _id: 'foo:b',
        _source: {
          type: 'a',
          unsafe_properties: { a: { name: 'AAA' } },
          migrationVersion: { _corrupt: '7.0.0-test' },
          status: 'corrupt',
        },
      },
      {
        _id: 'c:d',
        _source: {
          type: 'c',
          c: { name: 'TADA' },
          references: [],
          migrationVersion: {},
          status: 'valid',
        },
      },
    ]);

    expect(transform.mock.calls).toEqual([
      [
        {
          id: 'd',
          type: 'c',
          attributes: {
            name: 'DDD',
          },
          migrationVersion: {},
          references: [],
        },
      ],
    ]);

    expect(logger.warn).toBeCalledTimes(1);
  });
});
