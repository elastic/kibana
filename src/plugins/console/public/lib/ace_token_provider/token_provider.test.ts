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
import '../../application/models/sense_editor/sense_editor.test.mocks';

import $ from 'jquery';

// TODO:
// We import from application models as a convenient way to bootstrap loading up of an editor using
// this lib. We also need to import application specific mocks which is not ideal.
// In this situation, the token provider lib knows about app models in tests, which it really shouldn't. Should create
// a better sandbox in future.
import { create, SenseEditor } from '../../application/models/sense_editor';

import { Position, Token, TokensProvider } from '../../types';

interface RunTestArgs {
  input: string;
  done?: () => void;
}

describe('Ace (legacy) token provider', () => {
  let senseEditor: SenseEditor;
  let tokenProvider: TokensProvider;
  beforeEach(() => {
    // Set up our document body
    document.body.innerHTML = `<div>
        <div id="ConAppEditor" />
        <div id="ConAppEditorActions" />
        <div id="ConCopyAsCurl" />
      </div>`;

    senseEditor = create(document.querySelector<HTMLElement>('#ConAppEditor')!);

    $(senseEditor.getCoreEditor().getContainer())!.show();

    (senseEditor as any).autocomplete._test.removeChangeListener();
    tokenProvider = senseEditor.getCoreEditor().getTokenProvider();
  });

  afterEach(async () => {
    $(senseEditor.getCoreEditor().getContainer())!.hide();
    (senseEditor as any).autocomplete._test.addChangeListener();
    await senseEditor.update('', true);
  });

  describe('#getTokens', () => {
    const runTest = ({
      input,
      expectedTokens,
      done,
      lineNumber = 1,
    }: RunTestArgs & { expectedTokens: Token[] | null; lineNumber?: number }) => {
      senseEditor.update(input, true).then(() => {
        const tokens = tokenProvider.getTokens(lineNumber);
        expect(tokens).toEqual(expectedTokens);
        if (done) done();
      });
    };

    describe('base cases', () => {
      test('case 1 - only url', (done) => {
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
          done,
        });
      });

      test('case 2 - basic auth in host name', (done) => {
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
          done,
        });
      });

      test('case 3 - handles empty lines', (done) => {
        runTest({
          input: `POST abc


{
`,
          expectedTokens: [
            { type: 'method', value: 'POST', position: { lineNumber: 1, column: 1 } },
            { type: 'whitespace', value: ' ', position: { lineNumber: 1, column: 5 } },
            { type: 'url.part', value: 'abc', position: { lineNumber: 1, column: 6 } },
          ],
          done,
          lineNumber: 1,
        });
      });
    });

    describe('with newlines', () => {
      test('case 1 - newlines base case', (done) => {
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
          done,
          lineNumber: 3,
        });
      });
    });

    describe('edge cases', () => {
      test('case 1 - getting token outside of document', (done) => {
        runTest({
          input: `GET http://test:user@somehost/
{
  "wudup": "!"
}`,
          expectedTokens: null,
          done,
          lineNumber: 100,
        });
      });

      test('case 2 - empty lines', (done) => {
        runTest({
          input: `GET http://test:user@somehost/




{
  "wudup": "!"
}`,
          expectedTokens: [],
          done,
          lineNumber: 5,
        });
      });
    });
  });

  describe('#getTokenAt', () => {
    const runTest = ({
      input,
      expectedToken,
      done,
      position,
    }: RunTestArgs & { expectedToken: Token | null; position: Position }) => {
      senseEditor.update(input, true).then(() => {
        const tokens = tokenProvider.getTokenAt(position);
        expect(tokens).toEqual(expectedToken);
        if (done) done();
      });
    };

    describe('base cases', () => {
      it('case 1 - gets a token from the url', (done) => {
        const input = `GET http://test:user@somehost/`;
        runTest({
          input,
          expectedToken: {
            position: { lineNumber: 1, column: 4 },
            type: 'whitespace',
            value: ' ',
          },
          position: { lineNumber: 1, column: 5 },
        });

        runTest({
          input,
          expectedToken: {
            position: { lineNumber: 1, column: 5 },
            type: 'url.protocol_host',
            value: 'http://test:user@somehost',
          },
          position: { lineNumber: 1, column: input.length },
          done,
        });
      });
    });

    describe('special cases', () => {
      it('case 1 - handles input outside of range', (done) => {
        runTest({
          input: `GET abc`,
          expectedToken: null,
          done,
          position: { lineNumber: 1, column: 99 },
        });
      });
    });
  });
});
