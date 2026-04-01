/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';
import { findTargetEntry } from './create_single_compile_config';

const tmpDir = Path.resolve(__dirname, '__fixtures__', 'find_target_entry_test');

function createFile(relativePath: string) {
  const fullPath = Path.join(tmpDir, relativePath);
  Fs.mkdirSync(Path.dirname(fullPath), { recursive: true });
  Fs.writeFileSync(fullPath, '// test');
}

beforeAll(() => {
  Fs.mkdirSync(tmpDir, { recursive: true });
  createFile('plugin-a/public/index.ts');
  createFile('plugin-a/common/index.ts');
  createFile('plugin-b/public/index.tsx');
  createFile('plugin-c/public/index.js');
  createFile('plugin-d/public/index.jsx');
  // plugin-e has no index files in common/
  Fs.mkdirSync(Path.join(tmpDir, 'plugin-e', 'common'), { recursive: true });
  Fs.writeFileSync(Path.join(tmpDir, 'plugin-e', 'common', 'utils.ts'), '// no index');
});

afterAll(() => {
  Fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('findTargetEntry', () => {
  it('finds index.ts in the public directory by default', () => {
    const result = findTargetEntry(Path.join(tmpDir, 'plugin-a'));
    expect(result).toBe(Path.join(tmpDir, 'plugin-a', 'public', 'index.ts'));
  });

  it('finds index.ts in an extraPublicDir target', () => {
    const result = findTargetEntry(Path.join(tmpDir, 'plugin-a'), 'common');
    expect(result).toBe(Path.join(tmpDir, 'plugin-a', 'common', 'index.ts'));
  });

  it('finds index.tsx', () => {
    const result = findTargetEntry(Path.join(tmpDir, 'plugin-b'), 'public');
    expect(result).toBe(Path.join(tmpDir, 'plugin-b', 'public', 'index.tsx'));
  });

  it('finds index.js', () => {
    const result = findTargetEntry(Path.join(tmpDir, 'plugin-c'), 'public');
    expect(result).toBe(Path.join(tmpDir, 'plugin-c', 'public', 'index.js'));
  });

  it('finds index.jsx', () => {
    const result = findTargetEntry(Path.join(tmpDir, 'plugin-d'), 'public');
    expect(result).toBe(Path.join(tmpDir, 'plugin-d', 'public', 'index.jsx'));
  });

  it('returns null when the target directory has no index file', () => {
    const result = findTargetEntry(Path.join(tmpDir, 'plugin-e'), 'common');
    expect(result).toBeNull();
  });

  it('returns null when the target directory does not exist', () => {
    const result = findTargetEntry(Path.join(tmpDir, 'plugin-a'), 'server');
    expect(result).toBeNull();
  });

  it('returns null when the plugin directory does not exist', () => {
    const result = findTargetEntry(Path.join(tmpDir, 'nonexistent'), 'public');
    expect(result).toBeNull();
  });
});
