/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import type { EvalsSuiteMetadataEntry } from './eval_pipeline';

// Reads the real config, unlike `eval_pipeline.test.ts` which mocks `fs` with a fixture. These
// mistakes are only reachable by hand-editing the file, so a PR-time check is the cheapest guard.
const suites = (
  JSON.parse(Fs.readFileSync(Path.join(__dirname, 'evals.suites.json'), 'utf-8')) as {
    suites: EvalsSuiteMetadataEntry[];
  }
).suites;

const shardedSuites = suites.filter((suite) => (suite.shards?.length ?? 0) > 0);

describe('evals.suites.json shards', () => {
  it('gives every shard a non-empty id, unique within its suite', () => {
    const problems: string[] = [];

    for (const { id: suiteId, shards = [] } of shardedSuites) {
      const seen = new Set<string>();

      shards.forEach((shard, index) => {
        const shardId = shard.id?.trim();
        if (!shardId) {
          // An empty id leaves the step key unsuffixed, so two of them collide and Buildkite
          // rejects the whole fanout upload.
          problems.push(`${suiteId}: shard at index ${index} has no id`);
          return;
        }
        if (seen.has(shardId)) {
          problems.push(`${suiteId}: duplicate shard id "${shardId}"`);
        }
        seen.add(shardId);
      });
    }

    expect(problems).toEqual([]);
  });

  it('filters every shard by grep or grepInvert', () => {
    const problems = shardedSuites.flatMap(({ id: suiteId, shards = [] }) =>
      shards
        // A shard with neither runs the entire suite, overlapping the other shards, and stays green.
        .filter((shard) => !shard.grep?.trim() && !shard.grepInvert?.trim())
        .map((shard) => `${suiteId}: shard "${shard.id}" has neither grep nor grepInvert`)
    );

    expect(problems).toEqual([]);
  });

  it('uses patterns Playwright can compile', () => {
    const compiles = (pattern: string): boolean => {
      try {
        RegExp(pattern);
        return true;
      } catch {
        return false;
      }
    };

    const problems = shardedSuites.flatMap(({ id: suiteId, shards = [] }) =>
      shards.flatMap((shard) =>
        (
          [
            ['grep', shard.grep],
            ['grepInvert', shard.grepInvert],
          ] as const
        )
          .filter(([, pattern]) => pattern && !compiles(pattern))
          .map(
            ([field, pattern]) => `${suiteId}: shard "${shard.id}" has invalid ${field}: ${pattern}`
          )
      )
    );

    expect(problems).toEqual([]);
  });
});
