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
  test('converts raw docs to saved objects', async () => {
    const transform = jest.fn<any, any>((doc: any) => _.set(doc, 'attributes.name', 'HOI!'));
    const result = await migrateRawDocs(
      new SavedObjectsSerializer(new SavedObjectTypeRegistry()),
      transform,
      [
        { _id: 'a:b', _source: { type: 'a', a: { name: 'AAA' } } },
        { _id: 'c:d', _source: { type: 'c', c: { name: 'DDD' } } },
      ],
      createSavedObjectsMigrationLoggerMock()
    );

    expect(result).toEqual([
      {
        _id: 'a:b',
        _source: { type: 'a', a: { name: 'HOI!' }, migrationVersion: {}, references: [] },
      },
      {
        _id: 'c:d',
        _source: { type: 'c', c: { name: 'HOI!' }, migrationVersion: {}, references: [] },
      },
    ]);

    expect(transform).toHaveBeenCalled();
  });

  test('passes invalid docs through untouched and logs error', async () => {
    const logger = createSavedObjectsMigrationLoggerMock();
    const transform = jest.fn<any, any>((doc: any) =>
      _.set(_.cloneDeep(doc), 'attributes.name', 'TADA')
    );
    const result = await migrateRawDocs(
      new SavedObjectsSerializer(new SavedObjectTypeRegistry()),
      transform,
      [
        { _id: 'foo:b', _source: { type: 'a', a: { name: 'AAA' } } },
        { _id: 'c:d', _source: { type: 'c', c: { name: 'DDD' } } },
      ],
      logger
    );

    expect(result).toEqual([
      { _id: 'foo:b', _source: { type: 'a', a: { name: 'AAA' } } },
      {
        _id: 'c:d',
        _source: { type: 'c', c: { name: 'TADA' }, migrationVersion: {}, references: [] },
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

    expect(logger.error).toBeCalledTimes(1);
  });
});
