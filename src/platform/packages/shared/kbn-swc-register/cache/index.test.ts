/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import Path from 'path';

import { determineCachePrefix } from '.';

const ORIGINAL_CWD = process.cwd();

afterEach(() => {
  process.chdir(ORIGINAL_CWD);
});

it('determines a cache prefix that is stable across working directories', () => {
  const rootPrefix = determineCachePrefix();

  process.chdir(Path.resolve(ORIGINAL_CWD, 'src'));

  expect(determineCachePrefix()).toBe(rootPrefix);
});

it('loads lmdb when code generation from strings is disabled', () => {
  const script = `
    const assert = require('assert');
    const lmdb = require(${JSON.stringify(require.resolve('lmdb'))});
    const key = ['code:\\u65e5\\u672c\\u8a9e:\\ud83d\\ude80', 'x'.repeat(100)];

    assert.deepStrictEqual(lmdb.bufferToKeyValue(lmdb.keyValueToBuffer(key)), key);
  `;

  expect(() =>
    execFileSync(process.execPath, ['--disallow-code-generation-from-strings', '-e', script])
  ).not.toThrow();
});
