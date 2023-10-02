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
import { ESQLAst, ESQLAstItem, ESQLCommand } from './types';

function astArgsTextWalker(astItem: ESQLAstItem | ESQLCommand, textFn: (text: string) => string) {
  if ('args' in astItem && astItem.args?.length) {
    for (const arg of astItem.args) {
      if ('text' in arg) {
        arg.text = textFn(arg.text);
      }
      astArgsTextWalker(arg, textFn);
    }
  }
}

function astTextWalker(ast: ESQLAst, textFn: (text: string) => string) {
  for (const command of ast) {
    command.text = textFn(command.text);
    astArgsTextWalker(command, textFn);
  }
}

function upperCaseText(ast: ESQLAst): ESQLAst {
  const astCopy = JSON.parse(JSON.stringify(ast));
  astTextWalker(astCopy, (text) => text.toUpperCase());
  return astCopy;
}

describe('ast_listener', () => {
  const getAst = (text: string) => {
    const errorListener = new ANTLREErrorListener();
    const parseListener = new AstListener();
    const parser = getParser(CharStreams.fromString(text), errorListener, parseListener);

    parser[ROOT_STATEMENT]();

    return parseListener.getAstAndErrors();
  };

  const testAst = (text: string, expected: ESQLAst, expectedErrors: string[] = []) => {
    const expectedVariants = {
      lowerCase: expected,
      // upperCase: upperCaseText(expected),
    };
    const inputs = {
      lowerCase: text,
      // upperCase: text.toUpperCase(),
    } as const;
    for (const inputType of Object.keys(inputs) as Array<keyof typeof inputs>) {
      const inputText = inputs[inputType];
      const expectedAst = expectedVariants[inputType];

      test(`[${inputType}]: ${inputText} => [${JSON.stringify(expectedAst)}]`, () => {
        const { ast, errors } = getAst(inputText);
        expect(ast).toEqual(expectedAst);
        if (expectedErrors?.length) {
          expect(errors.map(({ text: message }) => message)).toEqual(expectedErrors);
        }
      });
    }
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
            {
              type: 'function',
              args: [],
              name: 'info',
              text: 'showinfo',
              location: { min: 5, max: 9 },
            },
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

    describe('from', () => {
      testAst('from a', [
        {
          type: 'command',
          name: 'from',
          text: 'froma',
          location: { min: 0, max: 4 },
          args: [{ type: 'source', name: 'a', text: 'froma', location: { min: 5, max: 9 } }],
        },
      ]);
      testAst('from a, b', [
        {
          type: 'command',
          name: 'from',
          text: 'froma,b',
          location: { min: 0, max: 4 },
          args: [
            { type: 'source', name: 'a', text: 'a', location: { min: 5, max: 9 } },
            { type: 'source', name: 'b', text: 'a', location: { min: 5, max: 9 } },
          ],
        },
      ]);
      testAst('from a [metadata _id]', [
        {
          type: 'command',
          name: 'from',
          text: 'froma[metadata_id]',
          location: { min: 0, max: 4 },
          args: [
            { type: 'source', name: 'a', text: 'a', location: { min: 5, max: 9 } },
            {
              type: 'option',
              name: 'metadata',
              text: 'metadata_id',
              location: { min: 5, max: 9 },
              args: [
                {
                  type: 'column',
                  name: '_id',
                  text: '_id',
                  location: { min: 5, max: 9 },
                },
              ],
            },
          ],
        },
      ]);
      testAst('from a,b [metadata _id]', [
        {
          type: 'command',
          name: 'from',
          text: 'froma,b[metadata_id]',
          location: { min: 0, max: 4 },
          args: [
            { type: 'source', name: 'a', text: 'a', location: { min: 5, max: 9 } },
            { type: 'source', name: 'b', text: 'b', location: { min: 5, max: 9 } },
            {
              type: 'option',
              name: 'metadata',
              text: 'metadata_id',
              location: { min: 5, max: 9 },
              args: [
                {
                  type: 'column',
                  name: '_id',
                  text: '_id',
                  location: { min: 5, max: 9 },
                },
              ],
            },
          ],
        },
      ]);
    });
  });
});
