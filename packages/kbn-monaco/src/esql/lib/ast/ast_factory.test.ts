/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ANTLREErrorListener } from '../../../common/error_listener';
import { CharStreams } from 'antlr4ts';
import { getParser, ROOT_STATEMENT } from '../antlr_facade';
import { AstListener } from './ast_factory';

describe('ast_listener', () => {
  const getAst = (text: string) => {
    const errorListener = new ANTLREErrorListener();
    const parseListener = new AstListener();
    const parser = getParser(CharStreams.fromString(text), errorListener, parseListener);

    parser[ROOT_STATEMENT]();

    return parseListener.getAstAndErrors();
  };

  const testAst = (text: string, expected: object[], expectedErrors: string[] = []) => {
    test(`${text} => [${JSON.stringify(expected)}]`, () => {
      const { ast, errors } = getAst(text);
      expect(ast).toEqual(expected);
      if (expectedErrors?.length) {
        expect(errors.map(({ text: message }) => message)).toEqual(expectedErrors);
      }
    });
  };

  describe('source commands', () => {
    describe('show', () => {
      testAst('show info', [
        {
          type: 'command',
          name: 'show',
          text: 'showinfo',
          location: { min: 0, max: 4 },
          args: [
            { type: 'function', name: 'info', text: 'showinfo', location: { min: 5, max: 9 } },
          ],
        },
      ]);
      testAst('show functions', [
        {
          type: 'command',
          name: 'show',
          text: 'showfunctions',
          location: { min: 0, max: 4 },
          args: [
            {
              type: 'function',
              name: 'functions',
              text: 'showfunctions',
              location: { min: 5, max: 14 },
            },
          ],
        },
      ]);
      testAst(
        'show somethingelse',
        [
          {
            type: 'command',
            name: 'show',
            text: '',
            location: { min: 0, max: 4 },
            args: [],
          },
        ],
        ['SyntaxError: expected {SHOW} but found "somethingelse"']
      );
      testAst(
        'show ',
        [
          {
            type: 'command',
            name: 'show',
            text: '',
            location: { max: 4, min: 0 },
            args: [],
          },
        ],
        ['SyntaxError: expected {SHOW} but found "<EOF>"']
      );
      testAst(
        'show info,functions',
        [
          {
            type: 'command',
            name: 'show',
            text: 'showinfo',
            location: { max: 4, min: 0 },
            args: [
              { type: 'function', name: 'info', text: 'showinfo', location: { min: 5, max: 9 } },
            ],
          },
        ],
        ['SyntaxError: expected {<EOF>, PIPE} but found ","']
      );
    });
  });
});
