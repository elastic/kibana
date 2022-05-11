/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildSchema } from "./build_schema";
import { EcsNestedSchema, TOP_LEVEL_NAME } from "./common/types";

describe('buildSchema', () => {

  const testSchema: EcsNestedSchema = {
    myGroup: {
      fields: {
        id: {
        dashed_name: 'myGroup-id',
        description: 'My group\'s id.',
        example: 123456,
        flat_name: 'myGroup.id',
        level: 'extended',
        name: 'id',
        normalize: [],
        short: 'Id.',
        type: 'long'
        },
        timestamp: {
          dashed_name: 'myGroup-timestamp',
          description: 'Date/time when the event originated.',
          example: '2022-05-10T08:05:34.853Z',
          flat_name: 'myGroup.timestamp',
          level: 'extended',
          name: 'timestamp',
          normalize: [],
          required: true,
          short: 'Timestamp.',
          type: 'date'
        },
        'build.name': {
          dashed_name: 'myGroup-build-name',
          description: 'My group\'s build name.',
          example: 'build1',
          flat_name: 'myGroup.build.name',
          ignore_above: 1024,
          level: 'extended',
          name: 'name',
          normalize: [],
          short: 'Build ame.',
          type: 'keyword'
        }
      }
    },
    base: {
      fields: {
        name: {
          dashed_name: 'base-name',
          description: 'My other group\'s name.',
          example: 'test_test',
          flat_name: 'base.name',
          ignore_above: 1024,
          level: 'extended',
          name: 'name',
          normalize: [],
          short: 'Name.',
          type: 'keyword'
        }
      }
    }
  };

  test('empty result if no schema input', () => {
    const schema: EcsNestedSchema = {};
    let result = buildSchema(schema);
    expect(Object.keys(result).length).toBe(0);
  });

  test('actual build with top-level and non', () => {
    let result = buildSchema(testSchema);

    const resultGroups = Object.keys(result);

    expect(resultGroups.length).toBe(2);
    expect(resultGroups).toContain(TOP_LEVEL_NAME);
    expect(resultGroups).toContain('myGroup');

    const resultFields = Object.keys(result['myGroup']);
    expect(resultFields.length).toBe(3);

    const resultFieldsTopLevel = Object.keys(result[TOP_LEVEL_NAME]);
    expect(resultFieldsTopLevel.length).toBe(1);
  });

});