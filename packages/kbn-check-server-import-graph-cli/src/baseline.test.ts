/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';

import { diffBaseline, readBaseline, writeBaseline } from './baseline';

describe('diffBaseline', () => {
  it('reports added and removed importer/module pairs', () => {
    const diff = diffBaseline(
      { 'a.ts': ['@elastic/eui', 'react-use'], 'b.ts': ['@elastic/eui'] },
      { 'a.ts': ['@elastic/eui'], 'c.ts': ['react-intl'] }
    );

    expect(diff.added).toEqual([{ importer: 'c.ts', nodeModule: 'react-intl' }]);
    expect(diff.removed).toEqual([
      { importer: 'a.ts', nodeModule: 'react-use' },
      { importer: 'b.ts', nodeModule: '@elastic/eui' },
    ]);
  });

  it('is empty when both sides match regardless of order', () => {
    const diff = diffBaseline(
      { 'b.ts': ['react-use', '@elastic/eui'], 'a.ts': ['x'] },
      { 'a.ts': ['x'], 'b.ts': ['@elastic/eui', 'react-use'] }
    );

    expect(diff).toEqual({ added: [], removed: [] });
  });
});

describe('readBaseline / writeBaseline', () => {
  let dir: string;

  beforeEach(() => {
    dir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'server-import-graph-baseline-'));
  });

  afterEach(() => {
    Fs.rmSync(dir, { recursive: true, force: true });
  });

  it('returns an empty baseline when the file does not exist', () => {
    expect(readBaseline(Path.join(dir, 'missing.json'))).toEqual({});
  });

  it('writes sorted, de-duplicated violations and reads them back', () => {
    const path = Path.join(dir, 'baseline.json');
    writeBaseline(path, { 'b.ts': ['react-use', '@elastic/eui', 'react-use'], 'a.ts': ['x'] });

    expect(readBaseline(path)).toEqual({ 'a.ts': ['x'], 'b.ts': ['@elastic/eui', 'react-use'] });
    expect(Object.keys(JSON.parse(Fs.readFileSync(path, 'utf8')).violations)).toEqual([
      'a.ts',
      'b.ts',
    ]);
  });
});
