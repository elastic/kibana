/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { countEslintDisableLines } from './count_eslint_disable';

/* eslint-disable no-console */

describe('countEslintDisableLines', () => {
  test('number of "eslint-disable*" in a file', async () => {
    console.log('This is a test');

    // eslint-disable-next-line prefer-const
    let testVar: string = '';

    const counts = await countEslintDisableLines(__filename);
    expect(counts.eslintDisableLineCount).toBe(1);
    expect(counts.eslintDisableFileCount).toBe(1);

    // To avoid unused warning.
    return testVar;
  });

  test('number of "eslint-disable*" in a directory', async () => {
    const counts = await countEslintDisableLines(__dirname);
    expect(counts).toMatchInlineSnapshot(`
      Object {
        "eslintDisableFileCount": 3,
        "eslintDisableLineCount": 8,
      }
    `);
  });
});
