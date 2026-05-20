/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isScoutTestsOnlyDiff } from './selective_scout';

describe('isScoutTestsOnlyDiff', () => {
  it('returns false for an empty diff (no signal)', () => {
    expect(isScoutTestsOnlyDiff([])).toBe(false);
  });

  it('returns true for a single Scout UI spec', () => {
    expect(
      isScoutTestsOnlyDiff([
        'src/platform/plugins/shared/discover/test/scout/ui/parallel_tests/foo.spec.ts',
      ])
    ).toBe(true);
  });

  it('returns true for a single Scout API spec', () => {
    expect(
      isScoutTestsOnlyDiff([
        'x-pack/platform/plugins/shared/maps/test/scout/api/tests/health.spec.ts',
      ])
    ).toBe(true);
  });

  it('returns true for shared test code (fixtures, page objects) inside a scope', () => {
    expect(
      isScoutTestsOnlyDiff([
        'src/platform/plugins/shared/discover/test/scout/ui/fixtures/page_objects/landing.ts',
        'src/platform/plugins/shared/discover/test/scout/ui/helpers/build_query.ts',
      ])
    ).toBe(true);
  });

  it('returns true for custom Scout server directories (scout_*)', () => {
    expect(
      isScoutTestsOnlyDiff([
        'x-pack/solutions/security/plugins/cloud_security_posture/test/scout_with_setup/ui/tests/findings.spec.ts',
      ])
    ).toBe(true);
  });

  it('returns true for generated manifests under .meta', () => {
    expect(
      isScoutTestsOnlyDiff([
        'src/platform/plugins/shared/discover/test/scout/.meta/ui/configs.json',
      ])
    ).toBe(true);
  });

  it('treats README / *.md / CHANGELOG as noise (still true if every other file is Scout)', () => {
    expect(
      isScoutTestsOnlyDiff([
        'README.md',
        'src/platform/plugins/shared/discover/test/scout/ui/README',
        'CHANGELOG.asciidoc.md',
        'src/platform/plugins/shared/discover/test/scout/ui/tests/foo.spec.ts',
      ])
    ).toBe(true);
  });

  it('returns false when the diff is noise-only (no Scout signal)', () => {
    expect(isScoutTestsOnlyDiff(['README.md', 'docs/extend/scout/best-practices.md'])).toBe(false);
  });

  it('returns false when any non-Scout, non-noise file is present', () => {
    expect(
      isScoutTestsOnlyDiff([
        'src/platform/plugins/shared/discover/test/scout/ui/tests/foo.spec.ts',
        'src/platform/plugins/shared/discover/public/application/main.tsx',
      ])
    ).toBe(false);
  });

  it('returns false for plugin source changes that are not under a Scout scope', () => {
    expect(
      isScoutTestsOnlyDiff(['src/platform/plugins/shared/discover/public/application/main.tsx'])
    ).toBe(false);
  });

  it('does not confuse `test/scout_<custom>/<not-api-or-ui>` with a Scout scope', () => {
    expect(
      isScoutTestsOnlyDiff([
        'src/platform/plugins/shared/discover/test/scout_setup/playwright.config.ts',
      ])
    ).toBe(false);
  });
});
