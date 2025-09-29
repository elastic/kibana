/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs/promises';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { ToolingLog } from '@kbn/tooling-log';
import { concatenateProfiles } from './concatenate_profiles';
import type { CpuProfile } from './types';

function makeProfile(partial: Partial<CpuProfile>): CpuProfile {
  return {
    nodes: [],
    samples: [],
    timeDeltas: [],
    ...partial,
  } as CpuProfile;
}

const TMP_OUTPUT_DIR = Path.join(tmpdir(), 'kbn-profiler-tests');

async function createProfileDir() {
  await Fs.mkdir(TMP_OUTPUT_DIR, { recursive: true });
}

async function writeProfile(p: CpuProfile): Promise<string> {
  await createProfileDir();

  const file = Path.join(TMP_OUTPUT_DIR, `${randomUUID()}.cpuprofile`);
  await Fs.writeFile(file, JSON.stringify(p), 'utf8');
  return file;
}

describe('concatenateProfiles', () => {
  const log = new ToolingLog({ level: 'silent', writeTo: process.stdout });

  it('writes empty profile when none provided', async () => {
    const out = Path.join(TMP_OUTPUT_DIR, `${randomUUID()}.cpuprofile`);

    await createProfileDir();

    await concatenateProfiles({ log, name: 'empty', out, profilePaths: [] });

    const json = JSON.parse(await Fs.readFile(out, 'utf8'));

    expect(json.samples).toEqual([]);
    expect(json.timeDeltas).toEqual([]);
    expect(json.title).toBe('empty');
  });

  it('copies single profile (just sets title)', async () => {
    const p = makeProfile({ startTime: 0, endTime: 10, nodes: [], samples: [], timeDeltas: [] });
    const inFile = await writeProfile(p);
    const out = Path.join(TMP_OUTPUT_DIR, `${randomUUID()}.cpuprofile`);
    await concatenateProfiles({ log, name: 'single', out, profilePaths: [inFile] });
    const json = JSON.parse(await Fs.readFile(out, 'utf8'));
    expect(json.title).toBe('single');
    expect(json.startTime).toBe(0);
    expect(json.endTime).toBe(10);
  });

  it('concatenates multiple profiles sequentially', async () => {
    const p1 = makeProfile({
      startTime: 100,
      endTime: 160,
      nodes: [{ id: 1, callFrame: { functionName: 'A' } }],
      samples: [1],
      timeDeltas: [60],
    });
    const p2 = makeProfile({
      startTime: 50, // earlier start, but will be sorted
      endTime: 70,
      nodes: [{ id: 1, callFrame: { functionName: 'B' } }],
      samples: [1],
      timeDeltas: [20],
    });

    const f1 = await writeProfile(p1);
    const f2 = await writeProfile(p2);
    const out = Path.join(TMP_OUTPUT_DIR, `${randomUUID()}.cpuprofile`);
    await concatenateProfiles({ log, name: 'multi', out, profilePaths: [f1, f2] });
    const json = JSON.parse(await Fs.readFile(out, 'utf8'));
    expect(json.title).toBe('multi');
    // Two samples
    expect(json.samples.length).toBe(2);
    expect(new Set(json.nodes.map((n: any) => n.id))).toEqual(new Set([1, 2]));
  });
});
