/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectMigrationContext } from '@kbn/core/server';
import { indexPatternSavedObjectTypeMigrations } from './index_pattern_migrations';

const savedObjectMigrationContext = null as unknown as SavedObjectMigrationContext;

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

  describe('7.11.0', () => {
    const migrationFn = indexPatternSavedObjectTypeMigrations['7.11.0'];

    test('should set allowNoIndex', () => {
      const input = {
        type: 'index-pattern',
        id: 'logs-*',
        attributes: {},
      };
      const expected = {
        type: 'index-pattern',
        id: 'logs-*',
        attributes: {
          allowNoIndex: true,
        },
      };

      expect(migrationFn(input, savedObjectMigrationContext)).toEqual(expected);

      const input2 = {
        type: 'index-pattern',
        id: 'metrics-*',
        attributes: {},
      };
      const expected2 = {
        type: 'index-pattern',
        id: 'metrics-*',
        attributes: {
          allowNoIndex: true,
        },
      };

      expect(migrationFn(input2, savedObjectMigrationContext)).toEqual(expected2);

      const input3 = {
        type: 'index-pattern',
        id: 'xxx',
        attributes: {},
      };
      const expected3 = {
        type: 'index-pattern',
        id: 'xxx',
        attributes: {
          allowNoIndex: undefined,
        },
      };

      expect(migrationFn(input3, savedObjectMigrationContext)).toEqual(expected3);
    });
  });
});
