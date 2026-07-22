/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FtrConfigResultRecord } from './ftr_result_reuse';
import {
  classifyChangedFile,
  getTestRoot,
  mergeRecords,
  resolveReusableConfigs,
} from './ftr_result_reuse';

const pass = (config: string, sourceBuildNumber = 100): FtrConfigResultRecord => ({
  config,
  result: 'pass',
  sourceBuildNumber,
});
const fail = (config: string, sourceBuildNumber = 100): FtrConfigResultRecord => ({
  config,
  result: 'fail',
  sourceBuildNumber,
});

const CONFIG_A = 'x-pack/platform/test/functional/apps/lens/group3/config.ts';
const CONFIG_B = 'x-pack/solutions/security/test/functional/config.ts';

const baseInput = {
  candidateConfigs: [CONFIG_A, CONFIG_B],
  prevRecords: new Map([
    [CONFIG_A, pass(CONFIG_A)],
    [CONFIG_B, pass(CONFIG_B)],
  ]),
  changedFiles: [] as string[] | null,
  sameDist: true,
  sameEsSnapshot: true,
};

describe('getTestRoot', () => {
  it('returns the path up to the first /test/ segment', () => {
    expect(getTestRoot(CONFIG_A)).toBe('x-pack/platform/test');
    expect(getTestRoot(CONFIG_B)).toBe('x-pack/solutions/security/test');
    expect(getTestRoot('src/platform/test/api_integration/config.js')).toBe('src/platform/test');
  });

  it('returns null for paths without a test segment', () => {
    expect(getTestRoot('src/platform/plugins/shared/dashboard/public/plugin.ts')).toBeNull();
  });

  it('does not treat plugin-internal test dirs as FTR roots', () => {
    expect(
      getTestRoot('x-pack/platform/plugins/shared/lens/test/scout/ui/foo.spec.ts')
    ).toBeNull();
    expect(getTestRoot('src/platform/packages/shared/kbn-scout/test/helpers.ts')).toBeNull();
  });

  it('recognizes legacy x-pack test roots', () => {
    expect(getTestRoot('x-pack/test_serverless/functional/config.ts')).toBe('x-pack/test_serverless');
  });
});

describe('classifyChangedFile', () => {
  it('aborts on FTR-critical paths, including inside .buildkite', () => {
    expect(classifyChangedFile('.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml')).toEqual(
      { kind: 'abort', file: '.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml' }
    );
    expect(classifyChangedFile('yarn.lock').kind).toBe('abort');
  });

  it('ignores docs / CI noise', () => {
    expect(classifyChangedFile('docs/extend/testing.md').kind).toBe('ignore');
    expect(classifyChangedFile('.buildkite/pipelines/on_merge.yml').kind).toBe('ignore');
  });

  it('invalidates the test root for FTR test changes', () => {
    expect(classifyChangedFile('x-pack/platform/test/functional/services/some_service.ts')).toEqual(
      { kind: 'invalidate-root', root: 'x-pack/platform/test' }
    );
  });

  it('ignores Jest-only files outside test roots', () => {
    expect(
      classifyChangedFile('src/platform/plugins/shared/dashboard/public/plugin.test.ts').kind
    ).toBe('ignore');
    expect(
      classifyChangedFile('x-pack/platform/plugins/shared/lens/__snapshots__/foo.snap.js').kind
    ).toBe('ignore');
  });

  it('aborts on unrecognized source changes (fail closed)', () => {
    expect(classifyChangedFile('src/platform/plugins/shared/dashboard/public/plugin.ts').kind).toBe(
      'abort'
    );
    expect(classifyChangedFile('some_random_root_file.sh').kind).toBe('abort');
    // Plugin-internal test dirs are not FTR roots; Scout specs are not
    // .test.* files, so they fall through to abort rather than invalidating
    // a bogus root. (Scout-only diffs never reach reuse anyway — the
    // scout-tests-only fast path returns first.)
    expect(
      classifyChangedFile('x-pack/platform/plugins/shared/lens/test/scout/ui/foo.spec.ts').kind
    ).toBe('abort');
  });
});

describe('resolveReusableConfigs', () => {
  it('reuses all green configs on an empty diff (retrigger)', () => {
    const { reusable, abortReason } = resolveReusableConfigs(baseInput);
    expect(abortReason).toBeNull();
    expect([...reusable.keys()].sort()).toEqual([CONFIG_A, CONFIG_B].sort());
  });

  it('never reuses failed or missing configs', () => {
    const { reusable } = resolveReusableConfigs({
      ...baseInput,
      prevRecords: new Map([[CONFIG_A, fail(CONFIG_A)]]),
    });
    expect(reusable.size).toBe(0);
  });

  it('aborts when the dist differs', () => {
    const { reusable, abortReason } = resolveReusableConfigs({ ...baseInput, sameDist: false });
    expect(reusable.size).toBe(0);
    expect(abortReason).toContain('dist');
  });

  it('aborts when the ES snapshot manifest differs', () => {
    const { reusable, abortReason } = resolveReusableConfigs({
      ...baseInput,
      sameEsSnapshot: false,
    });
    expect(reusable.size).toBe(0);
    expect(abortReason).toContain('ES snapshot');
  });

  it('aborts when the diff cannot be computed', () => {
    const { reusable, abortReason } = resolveReusableConfigs({ ...baseInput, changedFiles: null });
    expect(reusable.size).toBe(0);
    expect(abortReason).toContain('diff');
  });

  it('invalidates only configs under a changed test root', () => {
    const { reusable, abortReason } = resolveReusableConfigs({
      ...baseInput,
      changedFiles: ['x-pack/solutions/security/test/functional/apps/some_test.ts'],
    });
    expect(abortReason).toBeNull();
    expect(reusable.has(CONFIG_A)).toBe(true);
    expect(reusable.has(CONFIG_B)).toBe(false);
  });

  it('aborts entirely on an unrecognized change', () => {
    const { reusable, abortReason } = resolveReusableConfigs({
      ...baseInput,
      changedFiles: ['src/platform/plugins/shared/dashboard/public/plugin.ts'],
    });
    expect(reusable.size).toBe(0);
    expect(abortReason).toContain('unrecognized');
  });

  it('still reuses when the diff is only docs / Jest noise', () => {
    const { reusable, abortReason } = resolveReusableConfigs({
      ...baseInput,
      changedFiles: [
        'docs/extend/testing.md',
        'src/platform/plugins/shared/dashboard/public/plugin.test.ts',
      ],
    });
    expect(abortReason).toBeNull();
    expect(reusable.size).toBe(2);
  });
});

describe('mergeRecords', () => {
  const artifact = (records: FtrConfigResultRecord[]) => ({
    commit: 'abc',
    effectiveDistId: 'build-1',
    esSnapshotManifest: 'https://storage/manifest.json',
    records,
  });

  it('lets a pass win over a fail across job retries', () => {
    const merged = mergeRecords([
      artifact([fail(CONFIG_A)]),
      artifact([pass(CONFIG_A, 101)]),
    ]);
    expect(merged.get(CONFIG_A)?.result).toBe('pass');
    expect(merged.get(CONFIG_A)?.sourceBuildNumber).toBe(101);
  });

  it('keeps a pass even if a later artifact reports a fail', () => {
    const merged = mergeRecords([
      artifact([pass(CONFIG_A)]),
      artifact([fail(CONFIG_A)]),
    ]);
    expect(merged.get(CONFIG_A)?.result).toBe('pass');
  });
});
