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

// @ts-ignore
import '../../../../public/quarantined/tests/src/setup_mocks';

import { Editor } from 'brace';
import $ from 'jquery';
// @ts-ignore
import { initializeInput } from '../../../../public/quarantined/src/input.js';

import { AceTokensProvider } from '.';
import { Position, Token, TokensProvider } from '../../interfaces';

describe('Ace (legacy) token provider', () => {
  let aceEditor: Editor & { $el: any; autocomplete: any; update: any };
  let tokenProvider: TokensProvider;
  beforeEach(() => {
    // Set up our document body
    document.body.innerHTML = `<div>
        <div id="ConAppEditor" />
        <div id="ConAppEditorActions" />
        <div id="ConCopyAsCurl" />
      </div>`;

    aceEditor = initializeInput(
      $('#ConAppEditor'),
      $('#ConAppEditorActions'),
      {},
      { applyCurrentSettings: () => {} },
      null
    );

    aceEditor = initializeInput(
      $('#ConAppEditor'),
      $('#ConAppEditorActions'),
      {},
      { applyCurrentSettings: () => {} },
      null
    );
    aceEditor.$el.show();
    aceEditor.autocomplete._test.removeChangeListener();
    tokenProvider = new AceTokensProvider(aceEditor.session);
  });
  afterEach(done => {
    aceEditor.$el.hide();
    aceEditor.autocomplete._test.addChangeListener();
    aceEditor.update('', done);
  });

  describe('#getTokens', () => {
    const runTest = ({
      input,
      expectedTokens,
      cb,
      lineNumber = 1,
    }: {
      input: string;
      expectedTokens: Token[] | null;
      cb: () => void;
      lineNumber?: number;
    }) => {
      aceEditor.update(input, function() {
        const tokens = tokenProvider.getTokens(lineNumber);
        expect(tokens).toEqual(expectedTokens);
        cb();
      });
    };

    describe('base cases', () => {
      test('case 1 - only url', function(cb) {
        runTest({
          input: `GET http://somehost/_search`,
          expectedTokens: [
            { type: 'method', value: 'GET', position: { lineNumber: 1, column: 1 } },
            { type: 'whitespace', value: ' ', position: { lineNumber: 1, column: 4 } },
            {
              type: 'url.protocol_host',
              value: 'http://somehost',
              position: { lineNumber: 1, column: 5 },
            },
            { type: 'url.slash', value: '/', position: { lineNumber: 1, column: 20 } },
            { type: 'url.part', value: '_search', position: { lineNumber: 1, column: 21 } },
          ],
          cb,
        });
      });

      test('case 2 - basic auth in host name', function(cb) {
        runTest({
          input: `GET http://test:user@somehost/`,
          expectedTokens: [
            { type: 'method', value: 'GET', position: { lineNumber: 1, column: 1 } },
            { type: 'whitespace', value: ' ', position: { lineNumber: 1, column: 4 } },
            {
              type: 'url.protocol_host',
              value: 'http://test:user@somehost',
              position: { lineNumber: 1, column: 5 },
            },
            { type: 'url.slash', value: '/', position: { lineNumber: 1, column: 30 } },
          ],
          cb,
        });
      });

      test('case 3 - handles empty lines', function(cb) {
        runTest({
          input: `POST abc


{
`,
          expectedTokens: [
            { type: 'method', value: 'POST', position: { lineNumber: 1, column: 1 } },
            { type: 'whitespace', value: ' ', position: { lineNumber: 1, column: 5 } },
            { type: 'url.part', value: 'abc', position: { lineNumber: 1, column: 6 } },
          ],
          cb,
          lineNumber: 1,
        });
      });
    });

    describe('with newlines', () => {
      test('case 1 - newlines base case', function(cb) {
        runTest({
          input: `GET http://test:user@somehost/
{
  "wudup": "!"
}`,
          expectedTokens: [
            { type: 'whitespace', value: '  ', position: { lineNumber: 3, column: 1 } },
            { type: 'variable', value: '"wudup"', position: { lineNumber: 3, column: 3 } },
            { type: 'punctuation.colon', value: ':', position: { lineNumber: 3, column: 10 } },
            { type: 'whitespace', value: ' ', position: { lineNumber: 3, column: 11 } },
            { type: 'string', value: '"!"', position: { lineNumber: 3, column: 12 } },
          ],
          cb,
          lineNumber: 3,
        });
      });
    });

    describe('edge cases', () => {
      test('case 1 - getting token outside of document', function(cb) {
        runTest({
          input: `GET http://test:user@somehost/
{
  "wudup": "!"
}`,
          expectedTokens: null,
          cb,
          lineNumber: 100,
        });
      });

      test('case 2 - empty lines', function(cb) {
        runTest({
          input: `GET http://test:user@somehost/
          



{
  "wudup": "!"
}`,
          expectedTokens: [],
          cb,
          lineNumber: 5,
        });
      });
    });
  });

  describe('#getTokenAt', () => {
    const runTest = ({
      input,
      expectedToken,
      cb,
      position,
    }: {
      input: string;
      expectedToken: Token | null;
      cb: () => void;
      position: Position;
    }) => {
      aceEditor.update(input, function() {
        const tokens = tokenProvider.getTokenAt(position);
        expect(tokens).toEqual(expectedToken);
        cb();
      });
    };

    describe('base cases', () => {
      it('case 1 - gets a token from the url', cb => {
        const input = `GET http://test:user@somehost/`;
        runTest({
          input,
          expectedToken: {
            position: { lineNumber: 1, column: 5 },
            type: 'url.protocol_host',
            value: 'http://test:user@somehost',
          },
          cb,
          position: { lineNumber: 1, column: 5 },
        });

        runTest({
          input,
          expectedToken: {
            position: { lineNumber: 1, column: input.length },
            type: 'url.slash',
            value: '/',
          },
          cb,
          position: { lineNumber: 1, column: input.length },
        });
      });
    });

    describe('special cases', () => {
      it('case 1 - handles input outside of range', cb => {
        runTest({
          input: `GET abc`,
          expectedToken: null,
          cb,
          position: { lineNumber: 1, column: 99 },
        });
      });
    });
  });
});
