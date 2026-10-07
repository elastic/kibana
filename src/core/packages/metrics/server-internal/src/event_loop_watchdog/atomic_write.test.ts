/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'node:fs';
import Os from 'node:os';
import Path from 'node:path';
import { STAGING_DIR, writeFileAtomically } from './atomic_write';

describe('writeFileAtomically', () => {
  let dir: string;

  beforeEach(() => {
    dir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'elw-write-'));
  });

  afterEach(() => {
    Fs.rmSync(dir, { recursive: true, force: true });
  });

  it('moves the complete file into place, leaving nothing staged', async () => {
    const file = await writeFileAtomically(dir, 'a.pb.gz', new Uint8Array([1, 2, 3]));
    expect(file).toBe(Path.join(dir, 'a.pb.gz'));
    expect([...Fs.readFileSync(file)]).toEqual([1, 2, 3]);
    expect(Fs.readdirSync(dir)).toEqual(['a.pb.gz']);
  });

  it('recreates the staging directory if it was collected meanwhile', async () => {
    await writeFileAtomically(dir, 'a.pb.gz', new Uint8Array([1]));
    Fs.rmSync(Path.join(dir, STAGING_DIR), { recursive: true, force: true });
    await writeFileAtomically(dir, 'b.pb.gz', new Uint8Array([2]));
    expect(Fs.readdirSync(dir).sort()).toEqual(['a.pb.gz', 'b.pb.gz']);
  });

  it('removes the staged file when it cannot be moved into place', async () => {
    Fs.mkdirSync(Path.join(dir, 'taken.pb.gz', 'nested'), { recursive: true });
    await expect(writeFileAtomically(dir, 'taken.pb.gz', new Uint8Array([1]))).rejects.toThrow();
    expect(Fs.readdirSync(dir)).toEqual(['taken.pb.gz']);
  });
});
