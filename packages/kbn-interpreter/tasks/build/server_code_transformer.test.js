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

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createServerCodeTransformer } from './server_code_transformer';

const JS_FIXTURE_PATH = resolve(__dirname, '__fixtures__/sample.js');
const JS_FIXTURE = readFileSync(JS_FIXTURE_PATH);

describe('js support', () => {
  it('transpiles js file', () => {
    const transformer = createServerCodeTransformer();
    expect(transformer(JS_FIXTURE, JS_FIXTURE_PATH)).toMatchInlineSnapshot(`
"\\"use strict\\";

var _util = _interopRequireDefault(require(\\"util\\"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable */
console.log(_util.default.format('hello world'));"
`);
  });

  it('throws errors for js syntax errors', () => {
    const transformer = createServerCodeTransformer();
    expect(() => transformer(Buffer.from(`export default 'foo`), JS_FIXTURE_PATH)).toThrowError(
      /Unterminated string constant/
    );
  });
});
