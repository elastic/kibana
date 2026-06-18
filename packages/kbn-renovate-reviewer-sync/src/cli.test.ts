/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve as pathResolve } from 'path';

import { FlagsReader } from '@kbn/dev-cli-runner';

import { parseCliFlags } from './cli';

// FlagsReader's constructor shape matches `getopts`: string flags that were
// passed without a value arrive as `""`, boolean flags default to `false`, and
// flags that weren't passed at all are `undefined`. We mirror that so tests
// stay honest about what the real runtime sees.
const buildFlagsReader = (flags: Record<string, string | boolean | undefined>): FlagsReader => {
  return new FlagsReader({
    _: [],
    write: flags.write ?? false,
    check: flags.check ?? false,
    'report-json': flags['report-json'],
  });
};

describe('parseCliFlags', () => {
  describe('WHEN no flags are passed', () => {
    it('SHOULD default to dry-run mode with no report path', () => {
      const result = parseCliFlags([], buildFlagsReader({}));
      expect(result).toEqual({ mode: 'dry-run', reportJsonPath: undefined });
    });
  });

  describe('WHEN --write is passed', () => {
    it('SHOULD select write mode', () => {
      const result = parseCliFlags(['--write'], buildFlagsReader({ write: true }));
      expect(result.mode).toBe('write');
    });
  });

  describe('WHEN --check is passed', () => {
    it('SHOULD select check mode', () => {
      const result = parseCliFlags(['--check'], buildFlagsReader({ check: true }));
      expect(result.mode).toBe('check');
    });
  });

  describe('WHEN both --write and --check are passed', () => {
    // The previous implementation silently preferred `--write`. A user who
    // combined them probably didn't have a coherent intent, so this must fail
    // loudly at the boundary instead of silently discarding `--check`.
    it('SHOULD throw a FlagError about mutual exclusion', () => {
      expect(() =>
        parseCliFlags(['--write', '--check'], buildFlagsReader({ write: true, check: true }))
      ).toThrow(/--write and --check are mutually exclusive/);
    });
  });

  describe('WHEN --report-json is passed with an absolute path', () => {
    it('SHOULD return that exact path', () => {
      const abs = pathResolve('/tmp/rrs-abs.json');
      const result = parseCliFlags(
        ['--report-json', abs],
        buildFlagsReader({ 'report-json': abs })
      );
      expect(result.reportJsonPath).toBe(abs);
    });
  });

  describe('WHEN --report-json is passed with a relative path', () => {
    // The previous implementation passed the raw relative string straight to
    // `fs.writeFileSync`, which resolves against `process.cwd()` implicitly.
    // Resolving to an absolute path at the CLI boundary makes the destination
    // deterministic regardless of where the orchestrator later chooses to
    // write from, and keeps the logged "📝 Wrote JSON report to …" line
    // self-sufficient for locating the file.
    it('SHOULD resolve the path to absolute (relative to cwd)', () => {
      const result = parseCliFlags(
        ['--report-json', 'rel/report.json'],
        buildFlagsReader({ 'report-json': 'rel/report.json' })
      );
      expect(result.reportJsonPath).toBe(pathResolve(process.cwd(), 'rel/report.json'));
    });
  });

  describe('WHEN --report-json is passed with no following value', () => {
    // Top-priority fix. `FlagsReader.path()` collapses both "flag absent" and
    // "flag present without value" to `undefined`, so the pre-fix behavior
    // was "run the whole scan, write nothing, claim success". Detect the
    // bare-flag case in raw argv and throw before any work starts.
    it('SHOULD throw a FlagError about the missing path', () => {
      expect(() =>
        parseCliFlags(['--report-json'], buildFlagsReader({ 'report-json': '' }))
      ).toThrow(/--report-json requires a path argument/);
    });
  });

  describe('WHEN --report-json= is passed with an empty value', () => {
    it('SHOULD throw a FlagError about the missing path', () => {
      expect(() =>
        parseCliFlags(['--report-json='], buildFlagsReader({ 'report-json': '' }))
      ).toThrow(/--report-json requires a path argument/);
    });
  });

  describe('WHEN --report-json=VALUE is passed in the equals form', () => {
    it('SHOULD resolve the value to absolute and succeed', () => {
      const result = parseCliFlags(
        ['--report-json=rel/equals.json'],
        buildFlagsReader({ 'report-json': 'rel/equals.json' })
      );
      expect(result.reportJsonPath).toBe(pathResolve(process.cwd(), 'rel/equals.json'));
    });
  });

  describe('WHEN --report-json is not passed at all', () => {
    // The absent-flag path must remain a silent default (no error, no write)
    // so existing `node scripts/sync_renovate_reviewers.js` invocations stay
    // unchanged.
    it('SHOULD leave reportJsonPath undefined without erroring', () => {
      const result = parseCliFlags(['--write'], buildFlagsReader({ write: true }));
      expect(result.reportJsonPath).toBeUndefined();
      expect(result.mode).toBe('write');
    });
  });
});
