/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isJestTestPath, isJestTestsOnlyDiff } from './selective_jest';

describe('isJestTestPath', () => {
  it('returns true for co-located Jest specs and snapshots', () => {
    expect(
      isJestTestPath('src/platform/plugins/shared/discover/public/application/main.test.tsx')
    ).toBe(true);
    expect(isJestTestPath('packages/kbn-foo/src/util.test.ts')).toBe(true);
    expect(isJestTestPath('packages/kbn-foo/src/util.test.js')).toBe(true);
    expect(
      isJestTestPath('src/platform/plugins/shared/discover/public/__snapshots__/main.test.tsx.snap')
    ).toBe(true);
  });

  it('returns false for source files and FTR specs', () => {
    expect(isJestTestPath('src/platform/plugins/shared/discover/public/application/main.tsx')).toBe(
      false
    );
    // FTR specs deliberately avoid the `.test.` suffix.
    expect(isJestTestPath('src/platform/test/functional/apps/dashboard/group3/index.ts')).toBe(
      false
    );
    expect(isJestTestPath('x-pack/platform/test/api_integration/apis/stats.ts')).toBe(false);
  });
});

describe('isJestTestsOnlyDiff', () => {
  it('returns false for an empty diff (no signal)', () => {
    expect(isJestTestsOnlyDiff([])).toBe(false);
  });

  it('returns true for a single Jest spec', () => {
    expect(
      isJestTestsOnlyDiff(['src/platform/plugins/shared/discover/public/application/main.test.tsx'])
    ).toBe(true);
  });

  it('returns true for a snapshot-only update', () => {
    expect(
      isJestTestsOnlyDiff([
        'src/platform/plugins/shared/discover/public/__snapshots__/main.test.tsx.snap',
      ])
    ).toBe(true);
  });

  it('treats README / *.md / CHANGELOG as noise (still true if every other file is a Jest test)', () => {
    expect(
      isJestTestsOnlyDiff([
        'README.md',
        'CHANGELOG.asciidoc.md',
        'packages/kbn-foo/src/util.test.ts',
      ])
    ).toBe(true);
  });

  it('returns false when the diff is noise-only (no Jest signal)', () => {
    expect(isJestTestsOnlyDiff(['README.md'])).toBe(false);
  });

  it('returns false when any source file is present', () => {
    expect(
      isJestTestsOnlyDiff(['packages/kbn-foo/src/util.test.ts', 'packages/kbn-foo/src/util.ts'])
    ).toBe(false);
  });

  it('returns false for FTR / Scout / Cypress specs (not `.test.` files)', () => {
    expect(
      isJestTestsOnlyDiff(['src/platform/test/functional/apps/dashboard/group3/index.ts'])
    ).toBe(false);
    expect(
      isJestTestsOnlyDiff(['src/platform/plugins/shared/discover/test/scout/ui/tests/foo.spec.ts'])
    ).toBe(false);
  });
});
