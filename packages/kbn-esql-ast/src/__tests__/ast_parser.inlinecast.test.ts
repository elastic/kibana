/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAstAndSyntaxErrors as parse } from '../ast_parser';
import { ESQLInlineCast, ESQLSingleAstItem } from '../types';

describe('Inline cast (::)', () => {
  describe('correctly formatted', () => {
    it('can be a command argument', () => {
      const text = 'FROM kibana_ecommerce_data | EVAL field::string';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast[1]).toMatchInlineSnapshot(`
        Object {
          "args": Array [
            Object {
              "castType": "string",
              "incomplete": false,
              "location": Object {
                "max": 46,
                "min": 34,
              },
              "name": "inlineCast",
              "text": "field::string",
              "type": "inlineCast",
              "value": Object {
                "incomplete": false,
                "location": Object {
                  "max": 38,
                  "min": 34,
                },
                "name": "field",
                "quoted": false,
                "text": "field",
                "type": "column",
              },
            },
          ],
          "incomplete": false,
          "location": Object {
            "max": 46,
            "min": 29,
          },
          "name": "eval",
          "text": "EVALfield::string",
          "type": "command",
        }
      `);
    });

    it('can be a function argument', () => {
      const text = 'FROM kibana_ecommerce_data | EVAL round(field::long)';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast[1]).toMatchInlineSnapshot(`
        Object {
          "args": Array [
            Object {
              "args": Array [
                Object {
                  "castType": "long",
                  "incomplete": false,
                  "location": Object {
                    "max": 50,
                    "min": 40,
                  },
                  "name": "inlineCast",
                  "text": "field::long",
                  "type": "inlineCast",
                  "value": Object {
                    "incomplete": false,
                    "location": Object {
                      "max": 44,
                      "min": 40,
                    },
                    "name": "field",
                    "quoted": false,
                    "text": "field",
                    "type": "column",
                  },
                },
              ],
              "incomplete": false,
              "location": Object {
                "max": 51,
                "min": 34,
              },
              "name": "round",
              "text": "round(field::long)",
              "type": "function",
            },
          ],
          "incomplete": false,
          "location": Object {
            "max": 51,
            "min": 29,
          },
          "name": "eval",
          "text": "EVALround(field::long)",
          "type": "command",
        }
      `);
    });

    it('can be nested', () => {
      const text = 'FROM kibana_ecommerce_data | EVAL field::long::string::datetime';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      let currentNode = ast[1].args[0];
      let depth = 0;

      while (depth < 3) {
        expect((currentNode as ESQLSingleAstItem).type).toBe('inlineCast');
        currentNode = (currentNode as ESQLInlineCast).value;
        depth++;
      }

      expect((currentNode as ESQLSingleAstItem).name).toBe('field');
    });
  });
});
