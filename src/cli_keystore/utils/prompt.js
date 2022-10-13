/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

  return new Promise((resolve) => {
    const defaultValue = options.default ? true : false;
    const defaultPrompt = defaultValue ? 'Y/n' : 'y/N';

    rl.question(`${question} [${defaultPrompt}] `, (input) => {
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

  return new Promise((resolve) => {
    input.on('data', (char) => {
      char = char + '';

      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          input.pause();
          break;
        default:
          if (options.mask) {
            const cursorPos = rl.getCursorPos();
            output.moveCursor(0, -cursorPos.rows);
            output.cursorTo(questionPrompt.length);
            output.write(Array(rl.line.length + 1).join(options.mask || '*'));
          }

          break;
      }
    });

    rl.question(questionPrompt, (value) => {
      rl.close();
      resolve(value);
    });
  });
}
