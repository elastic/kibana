/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as mappings from './mappings';

describe('mappings', () => {
  it('should return the default mapping for the given type, do not change lightly or risk changing live mappings!', () => {
    expect(mappings.integer()).toMatchInlineSnapshot(`
      Object {
        "type": "integer",
      }
    `);
    expect(mappings.long()).toMatchInlineSnapshot(`
      Object {
        "type": "long",
      }
    `);
    expect(mappings.short()).toMatchInlineSnapshot(`
      Object {
        "type": "short",
      }
    `);
    expect(mappings.date()).toMatchInlineSnapshot(`
      Object {
        "type": "date",
      }
    `);
    expect(mappings.keyword()).toMatchInlineSnapshot(`
      Object {
        "ignore_above": 1024,
        "type": "keyword",
      }
    `);
    expect(mappings.text()).toMatchInlineSnapshot(`
      Object {
        "fields": Object {
          "keyword": Object {
            "ignore_above": 1024,
            "type": "keyword",
          },
        },
        "type": "text",
      }
    `);
    expect(mappings.boolean()).toMatchInlineSnapshot(`
      Object {
        "type": "boolean",
      }
    `);
    expect(mappings.dateNanos()).toMatchInlineSnapshot(`
      Object {
        "type": "date_nanos",
      }
    `);
    expect(mappings.flattened()).toMatchInlineSnapshot(`
      Object {
        "type": "flattened",
      }
    `);
    expect(mappings.object({ properties: {} })).toMatchInlineSnapshot(`
      Object {
        "properties": Object {},
        "type": "object",
      }
    `);
  });

  it('Maps object properties to the correct mapping', () => {
    const properties = {
      name: mappings.text(),
      age: mappings.integer(),
    };

    expect(mappings.object({ properties })).toMatchInlineSnapshot(`
      Object {
        "properties": Object {
          "age": Object {
            "type": "integer",
          },
          "name": Object {
            "fields": Object {
              "keyword": Object {
                "ignore_above": 1024,
                "type": "keyword",
              },
            },
            "type": "text",
          },
        },
        "type": "object",
      }
    `);
  });

  it('Allows omitting the default mapping', () => {
    expect(mappings.text({ fields: undefined })).toEqual({
      type: 'text',
    });
  });

  it('Allows overriding the default mapping', () => {
    expect(mappings.text({ fields: { keyword: { type: 'keyword', ignore_above: 2048 } } })).toEqual(
      {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 2048,
          },
        },
      }
    );
  });
});
