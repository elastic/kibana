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

import { createInterface } from 'readline';

/**
 * @param {String} question
 * @param {Object|null} options
 * @property {Boolean} options.default
 * @property {Stream} options.input - defaults to process.stdin
 * @property {Stream} options.output - defaults to process.stdout
 */

export function confirm(question, options = {}) {
  const rl = createInterface({
    input: options.input || process.stdin,
    output: options.output || process.stdout,
  });

  return new Promise(resolve => {
    const defaultValue = options.default ? true : false;
    const defaultPrompt = defaultValue ? 'Y/n' : 'y/N';

    rl.question(`${question} [${defaultPrompt}] `, input => {
      let value = defaultValue;

      if (input != null && input !== '') {
        value = /^y(es)?/i.test(input);
      }

      rl.close();
      resolve(value);
    });
  });
}

/**
 * @param {String} question
 * @param {Object|null} options
 * @property {Boolean} options.mask
 * @property {Stream} options.input - defaults to process.stdin
 * @property {Stream} options.output - defaults to process.stdout
 */

export function question(question, options = {}) {
  const input = options.input || process.stdin;
  const output = options.output || process.stdout;

  const questionPrompt = `${question}: `;
  const rl = createInterface({ input, output });

  return new Promise(resolve => {
    input.on('data', char => {
      char = char + '';

      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          input.pause();
          break;
        default:
          if (options.mask) {
            output.cursorTo(questionPrompt.length);
            output.write(Array(rl.line.length + 1).join(options.mask || '*'));
          }

          break;
      }
    });

    rl.question(questionPrompt, value => {
      resolve(value);
    });
  });
}
