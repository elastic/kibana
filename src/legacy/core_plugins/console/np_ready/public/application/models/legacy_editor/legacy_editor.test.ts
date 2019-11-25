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

import { Range as AceRange } from 'brace';
import { LegacyEditor } from './legacy_editor';

describe('Legacy Editor', () => {
  const aceMock: any = {
    getValue() {
      return 'ok';
    },

    getCursorPosition() {
      return {
        row: 1,
        column: 1,
      };
    },

    getSession() {
      return {
        replace(range: AceRange, value: string) {},
        getLine(n: number) {
          return 'line';
        },
        doc: {
          getTextRange(r: any) {
            return '';
          },
        },
        getState(n: number) {
          return n;
        },
      };
    },
  };

  // This is to ensure that we are correctly importing Ace's Range component
  it('smoke tests for updates to ranges', () => {
    const legacyEditor = new LegacyEditor(aceMock);
    legacyEditor.getValueInRange({
      start: { lineNumber: 1, column: 1 },
      end: { lineNumber: 2, column: 2 },
    });
    legacyEditor.replace(
      {
        start: { lineNumber: 1, column: 1 },
        end: { lineNumber: 2, column: 2 },
      },
      'test!'
    );
  });
});
