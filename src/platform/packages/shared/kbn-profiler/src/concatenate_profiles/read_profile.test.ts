/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs/promises';
import { writeFileSync } from 'fs';
import Path from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { ToolingLog } from '@kbn/tooling-log';
import { readProfile } from './read_profile';

function tempFile(): string {
  const dir = Path.join(tmpdir(), 'kbn-profiler-read-tests');
  return Path.join(dir, `${randomUUID()}.cpuprofile`);
}

const log = new ToolingLog({
  level: 'verbose',
  writeTo: {
    write: () => {},
  },
});

// Utility valid profile object
const BASE_PROFILE = {
  nodes: [{ id: 1, callFrame: { functionName: 'root' } }],
  samples: [1],
  timeDeltas: [1000],
  startTime: 0,
  endTime: 1000,
  title: 'test',
};

describe('read_profile', () => {
  it('reads a valid profile immediately', async () => {
    const file = tempFile();

    await Fs.mkdir(Path.dirname(file), { recursive: true });
    await Fs.writeFile(file, JSON.stringify(BASE_PROFILE), 'utf8');

    const prof = await readProfile(file, log, {
      pollIntervalMs: 50,
      totalTimeoutMs: 2000,
      inactivityTimeoutMs: 500,
    });

    expect(prof.samples).toEqual([1]);
    expect(prof.nodes.length).toBe(1);
  });

  it('retries until file becomes valid JSON', async () => {
    const file = tempFile();
    await Fs.mkdir(Path.dirname(file), { recursive: true });
    // Write partial invalid JSON
    writeFileSync(file, '{ "nodes": [');
    // After 120ms, overwrite with full valid JSON
    setTimeout(() => {
      writeFileSync(file, JSON.stringify(BASE_PROFILE));
    }, 120);

    const prof = await readProfile(file, log, {
      pollIntervalMs: 40,
      totalTimeoutMs: 3000,
      inactivityTimeoutMs: 600,
    });
    expect(prof.samples.length).toBe(1);
  });

  it('aborts on inactivity timeout with persistent invalid content', async () => {
    const file = tempFile();
    await Fs.mkdir(Path.dirname(file), { recursive: true });
    // Write invalid JSON that will not change
    await Fs.writeFile(file, '{ "nodes": [', 'utf8');

    await expect(
      readProfile(file, log, {
        pollIntervalMs: 40,
        totalTimeoutMs: 1500,
        inactivityTimeoutMs: 200, // small inactivity window
      })
    ).rejects.toThrowError('Inactivity timeout exceeded');
  });

  it('aborts immediately with advice when JSON.parse throws RangeError (profile too large)', async () => {
    const file = tempFile();
    await Fs.mkdir(Path.dirname(file), { recursive: true });
    // minimal valid JSON string, but we'll force JSON.parse to throw RangeError
    await Fs.writeFile(file, '{}', 'utf8');

    const original = JSON.parse;
    jest.spyOn(JSON, 'parse').mockImplementation((str) => {
      if (str === '{}') {
        throw new RangeError('Invalid string length');
      }
      return original(str);
    });

    try {
      await expect(
        readProfile(file, log, {
          pollIntervalMs: 10,
          totalTimeoutMs: 500,
          inactivityTimeoutMs: 100,
        })
      ).rejects.toThrow(/KBN_PROFILER_SAMPLING_INTERVAL/);
    } finally {
      jest.spyOn(JSON, 'parse').mockRestore();
    }
  });
});
