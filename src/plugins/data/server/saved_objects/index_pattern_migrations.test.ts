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

import { SavedObjectMigrationContext } from 'kibana/server';
import { indexPatternSavedObjectTypeMigrations } from './index_pattern_migrations';

const savedObjectMigrationContext = (null as unknown) as SavedObjectMigrationContext;

describe('migration index-pattern', () => {
  describe('6.5.0', () => {
    const migrationFn = indexPatternSavedObjectTypeMigrations['6.5.0'];

    test('adds "type" and "typeMeta" properties to object when not declared', () => {
      expect(
        migrationFn(
          {
            type: 'index-pattern',
            attributes: {},
          },
          savedObjectMigrationContext
        )
      ).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "type": undefined,
    "typeMeta": undefined,
  },
  "type": "index-pattern",
}
`);
    });

    test('keeps "type" and "typeMeta" properties as is when declared', () => {
      expect(
        migrationFn(
          {
            type: 'index-pattern',
            attributes: {
              type: '123',
              typeMeta: '123',
            },
          },
          savedObjectMigrationContext
        )
      ).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "type": "123",
    "typeMeta": "123",
  },
  "type": "index-pattern",
}
`);
    });
  });

  describe('7.6.0', () => {
    const migrationFn = indexPatternSavedObjectTypeMigrations['7.6.0'];

    test('should remove the parent property and update the subType prop on every field that has them', () => {
      const input = {
        type: 'index-pattern',
        attributes: {
          title: 'test',
          fields:
            '[{"name":"customer_name","type":"string","esTypes":["text"],"count":0,"scripted":false,"searchable":true,"aggregatable":false,"readFromDocValues":false},{"name":"customer_name.keyword","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true,"subType":"multi","parent":"customer_name"}]',
        },
      };
      const expected = {
        type: 'index-pattern',
        attributes: {
          title: 'test',
          fields:
            '[{"name":"customer_name","type":"string","esTypes":["text"],"count":0,"scripted":false,"searchable":true,"aggregatable":false,"readFromDocValues":false},{"name":"customer_name.keyword","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true,"subType":{"multi":{"parent":"customer_name"}}}]',
        },
      };

      expect(migrationFn(input, savedObjectMigrationContext)).toEqual(expected);
    });
  });
});
