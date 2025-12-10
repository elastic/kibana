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
import { FileWalker } from '../file_walker';
import { ChangeTracker } from '.';

describe('ChangeTracker', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'change-tracker-'));
  });

  afterEach(() => {
    try {
      Fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {
      // ignore cleanup errors
    }
  });

  it('does nothing when no manifest exists', () => {
    const fw = new FileWalker({});
    const ct = new ChangeTracker(fw);

    expect(() => ct.ensureFresh(tmpDir)).not.toThrow();
    expect(ct.getVersion('/foo')).toBe(0);
  });

  it('bumps versions for changed files and calls invalidate on FileWalker', () => {
    const fileWalker = new FileWalker({});
    const changeTracker = new ChangeTracker(fileWalker);

    const manifest = Path.join(tmpDir, 'changed-files.json');
    const files = ['/a.js', '/b.js'];
    Fs.writeFileSync(manifest, JSON.stringify(files));

    const spy = jest.spyOn(fileWalker, 'invalidateChangedFiles');

    changeTracker.ensureFresh(tmpDir);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(files);

    for (const file of files) {
      expect(changeTracker.getVersion(file)).toBe(1);
    }

    // calling again without changing mtime should be a no-op
    spy.mockClear();
    changeTracker.ensureFresh(tmpDir);
    expect(spy).not.toHaveBeenCalled();
  });

  it('reads manifest again when mtime changes', () => {
    const fileWalker = new FileWalker({});
    const changeTracker = new ChangeTracker(fileWalker);
    const manifest = Path.join(tmpDir, 'changed-files.json');

    Fs.writeFileSync(manifest, JSON.stringify(['/a.js']));
    changeTracker.ensureFresh(tmpDir);

    // update manifest and mtime
    Fs.writeFileSync(manifest, JSON.stringify(['/a.js', '/c.js']));
    const stats = Fs.statSync(manifest);
    Fs.utimesSync(manifest, new Date(), new Date(stats.mtimeMs + 5));

    const spy = jest.spyOn(fileWalker, 'invalidateChangedFiles');
    changeTracker.ensureFresh(tmpDir);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
