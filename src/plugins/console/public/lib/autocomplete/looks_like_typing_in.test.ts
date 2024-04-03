/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import '../../application/models/sense_editor/sense_editor.test.mocks';

import { looksLikeTypingIn } from './looks_like_typing_in';
import { create } from '../../application/models';
import type { SenseEditor } from '../../application/models';
import type { CoreEditor, Position, Token, TokensProvider } from '../../types';

describe('looksLikeTypingIn', () => {
  let editor: SenseEditor;
  let coreEditor: CoreEditor;
  let tokenProvider: TokensProvider;

  beforeEach(() => {
    document.body.innerHTML = `<div>
        <div id="ConAppEditor" />
         <div id="ConAppEditorActions" />
        <div id="ConCopyAsCurl" />
      </div>`;
    editor = create(document.getElementById('ConAppEditor')!);
    coreEditor = editor.getCoreEditor();
    tokenProvider = coreEditor.getTokenProvider();
  });

  afterEach(async () => {
    await editor.update('', true);
  });

  describe('general typing in', () => {
    interface RunTestArgs {
      preamble: string;
      autocomplete?: string;
      input: string;
    }

    const runTest = async ({ preamble, autocomplete, input }: RunTestArgs) => {
      const pos: Position = { lineNumber: 1, column: 1 };

      await editor.update(preamble, true);
      pos.column += preamble.length;
      const lastEvaluatedToken = tokenProvider.getTokenAt(pos);

      if (autocomplete !== undefined) {
        await editor.update(coreEditor.getValue() + autocomplete, true);
        pos.column += autocomplete.length;
      }

      await editor.update(coreEditor.getValue() + input, true);
      pos.column += input.length;
      const currentToken = tokenProvider.getTokenAt(pos);

      expect(lastEvaluatedToken).not.toBeNull();
      expect(currentToken).not.toBeNull();
      expect(looksLikeTypingIn(lastEvaluatedToken!, currentToken!, coreEditor)).toBe(true);
    };

    const cases: RunTestArgs[] = [
      { preamble: 'G', input: 'E' },
      { preamble: 'GET .kibana', input: '/' },
      { preamble: 'GET .kibana', input: ',' },
      { preamble: 'GET .kibana', input: '?' },
      { preamble: 'GET .kibana/', input: '_' },
      { preamble: 'GET .kibana/', input: '?' },
      { preamble: 'GET .kibana,', input: '.' },
      { preamble: 'GET .kibana,', input: '?' },
      { preamble: 'GET .kibana?', input: 'k' },
      { preamble: 'GET .kibana?k', input: '=' },
      { preamble: 'GET .kibana?k=', input: 'v' },
      { preamble: 'GET .kibana?k=v', input: '&' },
      { preamble: 'GET .kibana?k', input: '&' },
      { preamble: 'GET .kibana?k&', input: 'k' },
      { preamble: 'GET ', autocomplete: '.kibana', input: '/' },
      { preamble: 'GET ', autocomplete: '.kibana', input: ',' },
      { preamble: 'GET ', autocomplete: '.kibana', input: '?' },
      { preamble: 'GET .ki', autocomplete: 'bana', input: '/' },
      { preamble: 'GET .ki', autocomplete: 'bana', input: ',' },
      { preamble: 'GET .ki', autocomplete: 'bana', input: '?' },
      { preamble: 'GET _nodes/', autocomplete: 'stats', input: '/' },
      { preamble: 'GET _nodes/sta', autocomplete: 'ts', input: '/' },
      { preamble: 'GET _nodes/', autocomplete: 'jvm', input: ',' },
      { preamble: 'GET _nodes/j', autocomplete: 'vm', input: ',' },
      { preamble: 'GET _nodes/jvm,', autocomplete: 'os', input: ',' },
      { preamble: 'GET .kibana,', autocomplete: '.security', input: ',' },
      { preamble: 'GET .kibana,.sec', autocomplete: 'urity', input: ',' },
      { preamble: 'GET .kibana,', autocomplete: '.security', input: '/' },
      { preamble: 'GET .kibana,.sec', autocomplete: 'urity', input: '/' },
      { preamble: 'GET .kibana,', autocomplete: '.security', input: '?' },
      { preamble: 'GET .kibana,.sec', autocomplete: 'urity', input: '?' },
      { preamble: 'GET .kibana/', autocomplete: '_search', input: '?' },
      { preamble: 'GET .kibana/_se', autocomplete: 'arch', input: '?' },
      { preamble: 'GET .kibana/_search?', autocomplete: 'expand_wildcards', input: '=' },
      { preamble: 'GET .kibana/_search?exp', autocomplete: 'and_wildcards', input: '=' },
      { preamble: 'GET .kibana/_search?expand_wildcards=', autocomplete: 'all', input: '&' },
      { preamble: 'GET .kibana/_search?expand_wildcards=a', autocomplete: 'll', input: '&' },
      { preamble: 'GET _cat/indices?s=index&', autocomplete: 'expand_wildcards', input: '=' },
      { preamble: 'GET _cat/indices?s=index&exp', autocomplete: 'and_wildcards', input: '=' },
      { preamble: 'GET _cat/indices?v&', autocomplete: 'expand_wildcards', input: '=' },
      { preamble: 'GET _cat/indices?v&exp', autocomplete: 'and_wildcards', input: '=' },
      // autocomplete skips one iteration of token evaluation if user types in every letter
      { preamble: 'GET .kibana', autocomplete: '/', input: '_' }, // token '/' may not be evaluated
      { preamble: 'GET .kibana', autocomplete: ',', input: '.' }, // token ',' may not be evaluated
      { preamble: 'GET .kibana', autocomplete: '?', input: 'k' }, // token '?' may not be evaluated
    ];
    for (const c of cases) {
      const name =
        c.autocomplete === undefined
          ? `'${c.preamble}' -> '${c.input}'`
          : `'${c.preamble}' -> '${c.autocomplete}' (autocomplte) -> '${c.input}'`;
      test(name, async () => runTest(c));
    }
  });

  describe('first typing in', () => {
    test(`'' -> 'G'`, () => {
      // this is based on an implementation within the evaluateCurrentTokenAfterAChange function
      const lastEvaluatedToken = { position: { column: 0, lineNumber: 0 }, value: '', type: '' };
      lastEvaluatedToken.position.lineNumber = coreEditor.getCurrentPosition().lineNumber;

      const currentToken = { position: { column: 1, lineNumber: 1 }, value: 'G', type: 'method' };
      expect(looksLikeTypingIn(lastEvaluatedToken, currentToken, coreEditor)).toBe(true);
    });
  });

  const matrices = [
    `
GET .kibana/ 
             
             
`
      .slice(1, -1)
      .split('\n'),
    `
                       
 POST test/_doc        
{"message": "test"}    
                       
GET /_cat/indices?v&s= 
                       
DE                     
`
      .slice(1, -1)
      .split('\n'),
    `
                  
PUT test/_doc/1   
{"field": "value"}
`
      .slice(1, -1)
      .split('\n'),
  ];

  describe('navigating the editor via keyboard arrow keys', () => {
    const runHorizontalZigzagWalkTest = async (matrix: string[]) => {
      const width = matrix[0].length;
      const height = matrix.length;

      await editor.update(matrix.join('\n'), true);
      let lastEvaluatedToken = tokenProvider.getTokenAt(coreEditor.getCurrentPosition());
      let currentToken: Token | null;

      for (let i = 1; i < height * width * 2; i++) {
        const pos = {
          column: 1 + (i % width),
          lineNumber: 1 + Math.floor(i / width),
        };
        if (pos.lineNumber % 2 === 0) {
          pos.column = width - pos.column + 1;
        }
        if (pos.lineNumber > height) {
          pos.lineNumber = 2 * height - pos.lineNumber + 1;
        }

        currentToken = tokenProvider.getTokenAt(pos);
        expect(lastEvaluatedToken).not.toBeNull();
        expect(currentToken).not.toBeNull();
        expect(looksLikeTypingIn(lastEvaluatedToken!, currentToken!, coreEditor)).toBe(false);
        lastEvaluatedToken = currentToken;
      }
    };

    for (const matrix of matrices) {
      test(`horizontal zigzag walk ${matrix[0].length}x${matrix.length} map`, () =>
        runHorizontalZigzagWalkTest(matrix));
    }
  });

  describe('clicking around the editor', () => {
    const runRandomClickingTest = async (matrix: string[], attempts: number) => {
      const width = matrix[0].length;
      const height = matrix.length;

      await editor.update(matrix.join('\n'), true);
      let lastEvaluatedToken = tokenProvider.getTokenAt(coreEditor.getCurrentPosition());
      let currentToken: Token | null;

      for (let i = 1; i < attempts; i++) {
        const pos = {
          column: Math.ceil(Math.random() * width),
          lineNumber: Math.ceil(Math.random() * height),
        };

        currentToken = tokenProvider.getTokenAt(pos);
        expect(lastEvaluatedToken).not.toBeNull();
        expect(currentToken).not.toBeNull();
        expect(looksLikeTypingIn(lastEvaluatedToken!, currentToken!, coreEditor)).toBe(false);
        lastEvaluatedToken = currentToken;
      }
    };

    for (const matrix of matrices) {
      const attempts = 4 * matrix[0].length * matrix.length;
      test(`random clicking ${matrix[0].length}x${matrix.length} map ${attempts} times`, () =>
        runRandomClickingTest(matrix, attempts));
    }
  });
});
