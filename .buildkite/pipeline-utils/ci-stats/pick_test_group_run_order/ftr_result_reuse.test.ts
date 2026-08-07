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
  getFtrResultReuseMode,
  isUnderFtrTestRoot,
  mergeRecords,
  resolveReusableConfigs,
} from './ftr_result_reuse';

describe('getFtrResultReuseMode', () => {
  it('defaults to shadow when unset or unrecognized', () => {
    expect(getFtrResultReuseMode(undefined)).toBe('shadow');
    expect(getFtrResultReuseMode('')).toBe('shadow');
    expect(getFtrResultReuseMode('banana')).toBe('shadow');
  });

  it('parses on and off', () => {
    expect(getFtrResultReuseMode('true')).toBe('on');
    expect(getFtrResultReuseMode('on')).toBe('on');
    expect(getFtrResultReuseMode('false')).toBe('off');
    expect(getFtrResultReuseMode('off')).toBe('off');
    expect(getFtrResultReuseMode('shadow')).toBe('shadow');
  });
});

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
  samePrLabels: true,
};

describe('isUnderFtrTestRoot', () => {
  it('recognizes the known FTR roots', () => {
    expect(isUnderFtrTestRoot(CONFIG_A)).toBe(true);
    expect(isUnderFtrTestRoot(CONFIG_B)).toBe(true);
    expect(isUnderFtrTestRoot('src/platform/test/api_integration/config.js')).toBe(true);
    expect(isUnderFtrTestRoot('x-pack/test_serverless/functional/config.ts')).toBe(true);
  });

  it('does not match plugin sources or plugin-internal test dirs', () => {
    expect(isUnderFtrTestRoot('src/platform/plugins/shared/dashboard/public/plugin.ts')).toBe(
      false
    );
    expect(
      isUnderFtrTestRoot('x-pack/platform/plugins/shared/lens/test/scout/ui/foo.spec.ts')
    ).toBe(false);
    expect(isUnderFtrTestRoot('src/platform/packages/shared/kbn-scout/test/helpers.ts')).toBe(
      false
    );
  });
});

describe('classifyChangedFile', () => {
  it('aborts on FTR-critical paths, including inside .buildkite', () => {
    expect(
      classifyChangedFile('.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml')
    ).toEqual({
      kind: 'abort',
      file: '.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml',
    });
    expect(classifyChangedFile('yarn.lock').kind).toBe('abort');
  });

  it('ignores docs / CI noise', () => {
    expect(classifyChangedFile('docs/extend/testing.md').kind).toBe('ignore');
    expect(classifyChangedFile('.buildkite/pipelines/on_merge.yml').kind).toBe('ignore');
  });

  it('aborts on any FTR test change (configs inherit across roots)', () => {
    expect(classifyChangedFile('x-pack/platform/test/functional/services/some_service.ts')).toEqual(
      { kind: 'abort', file: 'x-pack/platform/test/functional/services/some_service.ts' }
    );
  });

  it('aborts on FTR fixtures that match the irrelevant list (test root wins)', () => {
    // Screenshot baselines match `**/*.png` but directly determine outcomes.
    expect(
      classifyChangedFile('src/platform/test/functional/screenshots/baseline/area_chart.png')
    ).toEqual({
      kind: 'abort',
      file: 'src/platform/test/functional/screenshots/baseline/area_chart.png',
    });
    expect(
      classifyChangedFile('x-pack/platform/test/fleet_api_integration/apis/fixtures/pkg/icon.svg')
        .kind
    ).toBe('abort');
    expect(classifyChangedFile('x-pack/platform/test/functional/README.md').kind).toBe('abort');
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
  });

  it('ignores Scout specs, consistent with shouldSkipFtrTests', () => {
    // Scout (Playwright) trees can never affect FTR — FTR_IRRELEVANT_PATHS
    // matches them. (Scout-only diffs rarely reach reuse anyway: the
    // scout-tests-only fast path returns first.)
    expect(
      classifyChangedFile('x-pack/platform/plugins/shared/lens/test/scout/ui/foo.spec.ts').kind
    ).toBe('ignore');
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

  it('aborts when PR labels differ (label-driven env changes outcomes)', () => {
    const { reusable, abortReason } = resolveReusableConfigs({
      ...baseInput,
      samePrLabels: false,
    });
    expect(reusable.size).toBe(0);
    expect(abortReason).toContain('labels');
  });

  it('aborts when the diff cannot be computed', () => {
    const { reusable, abortReason } = resolveReusableConfigs({ ...baseInput, changedFiles: null });
    expect(reusable.size).toBe(0);
    expect(abortReason).toContain('diff');
  });

  it('aborts entirely on any FTR test change — even in a different test root', () => {
    // Configs inherit across roots (solution bases read the platform base),
    // so partial per-root reuse is not safe.
    const { reusable, abortReason } = resolveReusableConfigs({
      ...baseInput,
      changedFiles: ['x-pack/solutions/security/test/functional/apps/some_test.ts'],
    });
    expect(reusable.size).toBe(0);
    expect(abortReason).toContain('FTR-relevant');
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
    prLabels: '',
    records,
  });

  it('lets a pass win over a fail across job retries', () => {
    const merged = mergeRecords([artifact([fail(CONFIG_A)]), artifact([pass(CONFIG_A, 101)])]);
    expect(merged.get(CONFIG_A)?.result).toBe('pass');
    expect(merged.get(CONFIG_A)?.sourceBuildNumber).toBe(101);
  });

  it('keeps a pass even if a later artifact reports a fail', () => {
    const merged = mergeRecords([artifact([pass(CONFIG_A)]), artifact([fail(CONFIG_A)])]);
    expect(merged.get(CONFIG_A)?.result).toBe('pass');
  });
});
