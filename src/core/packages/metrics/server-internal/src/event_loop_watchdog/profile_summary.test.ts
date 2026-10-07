/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  Function as PprofFunction,
  Label,
  Line,
  Location,
  Profile,
  Sample,
  StringTable,
} from 'pprof-format';
import { formatSummary, sanitizeLocation, summarizeProfile, trimToBlocks } from './profile_summary';

const ROOT = '/kibana';

/** Builds an encoded-then-decoded profile; stacks are listed leaf first. */
const buildProfile = (
  samples: Array<{ stack: string[]; ts: number; count?: number; inner?: string; outer?: string }>
) => {
  const table = new StringTable();
  const names = [...new Set(samples.flatMap(({ stack }) => stack))];
  const functions = names.map(
    (name, index) =>
      new PprofFunction({
        id: index + 1,
        name: table.dedup(name),
        filename: table.dedup(`${ROOT}/src/${name}.ts`),
      })
  );
  const locations = names.map(
    (_, index) =>
      new Location({ id: index + 1, line: [new Line({ functionId: index + 1, line: 10 })] })
  );
  const label = (key: string, value: string | number) =>
    typeof value === 'number'
      ? new Label({ key: table.dedup(key), num: value })
      : new Label({ key: table.dedup(key), str: table.dedup(value) });
  const profile = new Profile({
    sample: samples.map(
      ({ stack, ts, count = 1, inner, outer }) =>
        new Sample({
          locationId: stack.map((name) => names.indexOf(name) + 1),
          value: [count, count * 10_000_000],
          label: [
            label('timestamp_us', ts),
            ...(outer ? [label('context_outer', outer)] : []),
            ...(inner ? [label('context_inner', inner)] : []),
          ],
        })
    ),
    function: functions,
    location: locations,
    stringTable: table,
  });
  return Profile.decode(profile.encode());
};

describe('summarizeProfile', () => {
  const profile = buildProfile([
    {
      stack: ['now', 'handler', 'run'],
      ts: 1_100,
      count: 3,
      outer: 'task manager:run x',
      inner: 'workflow step:test.cpuSpin',
    },
    {
      stack: ['now', 'handler', 'run'],
      ts: 1_200,
      inner: 'workflow step:test.cpuSpin',
      outer: 'task manager:run x',
    },
    { stack: ['handler', 'run'], ts: 1_300 },
    { stack: ['other', 'run'], ts: 5_000, count: 10 },
  ]);

  it('summarises samples within the blocks: self frames, callers and labels', () => {
    expect(summarizeProfile(profile, [[1_000, 2_000]], ROOT)).toEqual({
      scope: 'blocks',
      samples: 5,
      windowSamples: 15,
      frames: [
        {
          name: 'now',
          location: 'src/now.ts:10',
          samples: 4,
          percent: 80,
          callers: ['handler (src/handler.ts:10)', 'run (src/run.ts:10)'],
        },
        {
          name: 'handler',
          location: 'src/handler.ts:10',
          samples: 1,
          percent: 20,
          callers: ['run (src/run.ts:10)'],
        },
      ],
      labels: [
        {
          outer: 'task manager:run x',
          inner: 'workflow step:test.cpuSpin',
          samples: 4,
          percent: 80,
        },
        { outer: undefined, inner: undefined, samples: 1, percent: 20 },
      ],
    });
  });

  it('falls back to the whole window when no sample is within a block', () => {
    const summary = summarizeProfile(profile, [[9_000, 9_500]], ROOT);
    expect(summary).toMatchObject({ scope: 'window', samples: 15, windowSamples: 15 });
    expect(summary.frames[0]).toMatchObject({ name: 'other', samples: 10 });
  });

  it('formats a single readable line', () => {
    const summary = summarizeProfile(profile, [[1_000, 2_000]], ROOT);
    expect(formatSummary(summary, [1203], 1, { file: '/diag/x.pb.gz' })).toBe(
      'Event loop block profile #1: blocks [~1203ms], 5/15 samples in blocks. ' +
        'Top: 80% now (src/now.ts:10) <- handler (src/handler.ts:10) <- run (src/run.ts:10); ' +
        '20% handler (src/handler.ts:10) <- run (src/run.ts:10). ' +
        'Labels: 80% workflow step:test.cpuSpin in task manager:run x, 20% unlabelled. File: /diag/x.pb.gz'
    );
    expect(formatSummary(summary, [1203], 2, { notWritten: 'file limit (100) reached' })).toMatch(
      /^Event loop block profile #2: .* Not written: file limit \(100\) reached\.$/
    );
  });
});

describe('trimToBlocks', () => {
  const build = () =>
    buildProfile([
      { stack: ['early', 'run'], ts: 100 },
      { stack: ['before', 'run'], ts: 1_500 },
      { stack: ['now', 'handler', 'run'], ts: 2_000 },
      { stack: ['now', 'handler', 'run'], ts: 2_400 },
      { stack: ['between', 'run'], ts: 2_700 },
      { stack: ['spin', 'run'], ts: 3_000 },
      { stack: ['late', 'run'], ts: 9_000 },
    ]);
  const blockOf = (profile: Profile, sampleIndex: number) => {
    const strings = profile.stringTable.strings;
    return profile.sample[sampleIndex].label
      .filter(({ key }) => strings[Number(key)] === 'block')
      .map(({ num }) => Number(num));
  };
  const functionNames = (profile: Profile) =>
    profile.function.map(({ name }) => profile.stringTable.strings[Number(name)]).sort();

  it('keeps samples within the margin, labels in-block samples and prunes the rest', () => {
    const profile = build();
    trimToBlocks(
      profile,
      [
        [2_000, 2_400],
        [3_000, 3_000],
      ],
      500
    );
    // what is written must survive encoding
    const trimmed = Profile.decode(profile.encode());
    // 100 and 9_000 fall outside both blocks' margins; overlapping margins are merged.
    expect(trimmed.sample).toHaveLength(5);
    expect([0, 1, 2, 3, 4].map((index) => blockOf(trimmed, index))).toEqual([
      [],
      [1],
      [1],
      [],
      [2],
    ]);
    expect(functionNames(trimmed)).toEqual(['before', 'between', 'handler', 'now', 'run', 'spin']);
    expect(trimmed.location).toHaveLength(6);
    expect(BigInt(trimmed.timeNanos)).toBe(1_500_000n);
    expect(BigInt(trimmed.durationNanos)).toBe(1_500_000n);
  });

  it('keeps nothing outside the blocks without a margin', () => {
    const profile = build();
    trimToBlocks(profile, [[2_000, 2_400]], 0);
    expect(profile.sample).toHaveLength(2);
    expect(functionNames(profile)).toEqual(['handler', 'now', 'run']);
  });
});

describe('sanitizeLocation', () => {
  it('keeps repo-relative paths and node specifiers, and reduces others to basenames', () => {
    expect(sanitizeLocation('file:///kibana/src/a.ts?x', 3, ROOT)).toBe('src/a.ts:3');
    expect(sanitizeLocation('node:fs', 0, ROOT)).toBe('node:fs');
    expect(sanitizeLocation('/home/user/secret/b.js', 1, ROOT)).toBe('b.js:1');
    expect(sanitizeLocation('', 1, ROOT)).toBeUndefined();
  });
});
