/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import os from 'os';
import Path from 'path';
import { discoverFiles } from './discover_files';

describe('discoverFiles', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(Path.join(os.tmpdir(), 'discover-'));
    fs.writeFileSync(Path.join(root, 'a.yml'), 'a');
    fs.writeFileSync(Path.join(root, 'b.yaml'), 'b');
    fs.writeFileSync(Path.join(root, 'c.txt'), 'c');
    fs.writeFileSync(Path.join(root, '.hidden.yml'), 'hidden');
    fs.mkdirSync(Path.join(root, 'nested'));
    fs.writeFileSync(Path.join(root, 'nested', 'd.yml'), 'd');
    fs.mkdirSync(Path.join(root, '.git'));
    fs.writeFileSync(Path.join(root, '.git', 'e.yml'), 'e');
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('returns a single file when the target is a YAML file', () => {
    const file = Path.join(root, 'a.yml');
    expect(discoverFiles(file)).toEqual([file]);
  });

  it('throws when the target file is not YAML', () => {
    expect(() => discoverFiles(Path.join(root, 'c.txt'))).toThrow(/Not a YAML file/);
  });

  it('throws when the target path does not exist', () => {
    expect(() => discoverFiles(Path.join(root, 'missing.yml'))).toThrow(/does not exist/);
  });

  it('collects top-level YAML files only by default, skipping dotfiles and other extensions', () => {
    expect(discoverFiles(root)).toEqual([Path.join(root, 'a.yml'), Path.join(root, 'b.yaml')]);
  });

  it('descends into subdirectories when recursive, still skipping dot-directories', () => {
    expect(discoverFiles(root, { recursive: true })).toEqual([
      Path.join(root, 'a.yml'),
      Path.join(root, 'b.yaml'),
      Path.join(root, 'nested', 'd.yml'),
    ]);
  });

  it('returns an empty array for a directory with no YAML files', () => {
    const empty = fs.mkdtempSync(Path.join(os.tmpdir(), 'discover-empty-'));
    try {
      expect(discoverFiles(empty)).toEqual([]);
    } finally {
      fs.rmSync(empty, { recursive: true, force: true });
    }
  });
});
