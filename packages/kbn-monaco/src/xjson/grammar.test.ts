/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createParser } from './grammar';

describe('createParser', () => {
  let parser: ReturnType<typeof createParser>;

  beforeEach(() => {
    parser = createParser();
  });

  test('should create a xjson grammar parser', () => {
    expect(createParser()).toBeInstanceOf(Function);
  });

  test('should return no annotations in case of valid json', () => {
    expect(
      parser(`
        {"menu": {
          "id": "file",
          "value": "File",
          "quotes": "'\\"",
          "popup": {
            "actions": [
              "new",
              "open",
              "close"
            ],
            "menuitem": [
              {"value": "New"},
              {"value": "Open"},
              {"value": "Close"}
            ]
          }
        }}
      `)
    ).toMatchInlineSnapshot(`
      Object {
        "annotations": Array [],
      }
    `);
  });

  test('should support triple quotes', () => {
    expect(
      parser(`
        {"menu": {
          "id": """
          file
          """,
          "value": "File"
        }}
      `)
    ).toMatchInlineSnapshot(`
      Object {
        "annotations": Array [],
      }
    `);
  });

  test('triple quotes should be correctly closed', () => {
    expect(
      parser(`
        {"menu": {
          "id": """"
          file
          "",
          "value": "File"
        }}
      `)
    ).toMatchInlineSnapshot(`
      Object {
        "annotations": Array [
          Object {
            "at": 36,
            "text": "Expected ',' instead of '\\"'",
            "type": "error",
          },
        ],
      }
    `);
  });

  test('an escaped quote can be appended to the end of triple quotes', () => {
    expect(
      parser(`
        {"menu": {
          "id": """
          file
          \\"""",
          "value": "File"
        }}
      `)
    ).toMatchInlineSnapshot(`
      Object {
        "annotations": Array [],
      }
    `);
  });

  test('text values should be wrapper into quotes', () => {
    expect(
      parser(`
        {"menu": {
          "id": id,
          "value": "File"
        }}
      `)
    ).toMatchInlineSnapshot(`
      Object {
        "annotations": Array [
          Object {
            "at": 36,
            "text": "Unexpected 'i'",
            "type": "error",
          },
        ],
      }
    `);
  });

  test('check for close quotes', () => {
    expect(
      parser(`
        {"menu": {
          "id": "id,
          "value": "File"
        }}
      `)
    ).toMatchInlineSnapshot(`
      Object {
        "annotations": Array [
          Object {
            "at": 52,
            "text": "Expected ',' instead of 'v'",
            "type": "error",
          },
        ],
      }
    `);
  });
  test('no duplicate keys', () => {
    expect(
      parser(`
        {"menu": {
          "id": "id",
          "id": "File"
        }}
      `)
    ).toMatchInlineSnapshot(`
      Object {
        "annotations": Array [
          Object {
            "at": 53,
            "text": "Duplicate key \\"id\\"",
            "type": "warning",
          },
        ],
      }
    `);
  });

  test('all curly quotes should be closed', () => {
    expect(
      parser(`
        {"menu": {
          "id": "id",
          "name": "File"
       }
      `)
    ).toMatchInlineSnapshot(`
      Object {
        "annotations": Array [
          Object {
            "at": 82,
            "text": "Expected ',' instead of ''",
            "type": "error",
          },
        ],
      }
    `);
  });
});
