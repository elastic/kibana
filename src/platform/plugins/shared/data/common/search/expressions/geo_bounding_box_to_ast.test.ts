/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { geoBoundingBoxToAst } from './geo_bounding_box_to_ast';

describe('geoBoundingBoxToAst', () => {
  it('should return an expression', () => {
    expect(geoBoundingBoxToAst({ wkt: 'something' })).toHaveProperty('type', 'expression');
  });

  it('should forward arguments', () => {
    expect(geoBoundingBoxToAst({ wkt: 'something' })).toHaveProperty(
      'chain.0.arguments',
      expect.objectContaining({
        wkt: ['something'],
      })
    );

    expect(geoBoundingBoxToAst({ top: 1, left: 2, bottom: 3, right: 4 })).toHaveProperty(
      'chain.0.arguments',
      expect.objectContaining({
        top: [1],
        left: [2],
        bottom: [3],
        right: [4],
      })
    );
  });

  it('should construct points in sub-expressions', () => {
    expect(
      geoBoundingBoxToAst({
        top_left: '1, 2',
        bottom_right: '3, 4',
        top_right: '5, 6',
        bottom_left: '7, 8',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "chain": Array [
          Object {
            "arguments": Object {
              "bottomLeft": Array [
                Object {
                  "chain": Array [
                    Object {
                      "arguments": Object {
                        "point": Array [
                          "7, 8",
                        ],
                      },
                      "function": "geoPoint",
                      "type": "function",
                    },
                  ],
                  "type": "expression",
                },
              ],
              "bottomRight": Array [
                Object {
                  "chain": Array [
                    Object {
                      "arguments": Object {
                        "point": Array [
                          "3, 4",
                        ],
                      },
                      "function": "geoPoint",
                      "type": "function",
                    },
                  ],
                  "type": "expression",
                },
              ],
              "topLeft": Array [
                Object {
                  "chain": Array [
                    Object {
                      "arguments": Object {
                        "point": Array [
                          "1, 2",
                        ],
                      },
                      "function": "geoPoint",
                      "type": "function",
                    },
                  ],
                  "type": "expression",
                },
              ],
              "topRight": Array [
                Object {
                  "chain": Array [
                    Object {
                      "arguments": Object {
                        "point": Array [
                          "5, 6",
                        ],
                      },
                      "function": "geoPoint",
                      "type": "function",
                    },
                  ],
                  "type": "expression",
                },
              ],
            },
            "function": "geoBoundingBox",
            "type": "function",
          },
        ],
        "type": "expression",
      }
    `);
  });
});
