/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  SCOUT_TESTS_ONLY_NOISE_PATTERNS,
  SCOUT_TESTS_ONLY_PATTERNS,
  allFilesMatch,
  anyFileMatches,
  deriveScoutConfigsForFile,
  deriveScoutConfigsForFiles,
} from './tests_only';

describe('allFilesMatch', () => {
  it('returns false for empty file list', () => {
    expect(allFilesMatch([], ['**/*.ts'])).toBe(false);
  });

  it('returns true when every file matches at least one pattern', () => {
    const files = [
      'x/test/scout/ui/tests/a.spec.ts',
      'y/test/scout/api/fixtures/b.ts',
      'z/test/scout_custom/ui/parallel_tests/c.spec.ts',
    ];
    expect(allFilesMatch(files, SCOUT_TESTS_ONLY_PATTERNS)).toBe(true);
  });

  it('returns false when even one file does not match', () => {
    const files = ['x/test/scout/ui/tests/a.spec.ts', 'src/foo.ts'];
    expect(allFilesMatch(files, SCOUT_TESTS_ONLY_PATTERNS)).toBe(false);
  });

  it('treats dotfiles as matchable', () => {
    const files = ['pkg/test/scout/.meta/ui/standard.json'];
    expect(allFilesMatch(files, SCOUT_TESTS_ONLY_PATTERNS)).toBe(true);
  });
});

describe('anyFileMatches', () => {
  it('returns false for empty file list', () => {
    expect(anyFileMatches([], ['**/*.ts'])).toBe(false);
  });

  it('returns true when at least one file matches', () => {
    expect(anyFileMatches(['src/foo.ts', 'README.md'], SCOUT_TESTS_ONLY_NOISE_PATTERNS)).toBe(true);
  });

  it('returns false when no file matches', () => {
    expect(anyFileMatches(['src/foo.ts', 'src/bar.ts'], SCOUT_TESTS_ONLY_NOISE_PATTERNS)).toBe(
      false
    );
  });
});

describe('deriveScoutConfigsForFile', () => {
  let tmpRoot: string;

  const touch = (rel: string) => {
    const abs = path.join(tmpRoot, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, '');
  };

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-tests-only-'));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('returns [] for paths outside any Scout scope', () => {
    expect(deriveScoutConfigsForFile('src/core/server/foo.ts', tmpRoot)).toEqual([]);
    expect(deriveScoutConfigsForFile('test/scout/foo.ts', tmpRoot)).toEqual([]);
  });

  it('maps a single-thread spec to playwright.config.ts', () => {
    touch('pkg/test/scout/ui/playwright.config.ts');
    expect(deriveScoutConfigsForFile('pkg/test/scout/ui/tests/a.spec.ts', tmpRoot)).toEqual([
      'pkg/test/scout/ui/playwright.config.ts',
    ]);
  });

  it('maps a parallel spec to parallel.playwright.config.ts', () => {
    touch('pkg/test/scout/ui/parallel.playwright.config.ts');
    expect(
      deriveScoutConfigsForFile('pkg/test/scout/ui/parallel_tests/a.spec.ts', tmpRoot)
    ).toEqual(['pkg/test/scout/ui/parallel.playwright.config.ts']);
  });

  it('maps shared scope files (fixtures/page_objects/helpers) to both configs when both exist', () => {
    touch('pkg/test/scout/ui/playwright.config.ts');
    touch('pkg/test/scout/ui/parallel.playwright.config.ts');

    const configs = deriveScoutConfigsForFile(
      'pkg/test/scout/ui/fixtures/page_objects/foo.ts',
      tmpRoot
    );
    expect(configs.sort()).toEqual([
      'pkg/test/scout/ui/parallel.playwright.config.ts',
      'pkg/test/scout/ui/playwright.config.ts',
    ]);
  });

  it('drops configs that do not exist on disk', () => {
    touch('pkg/test/scout/ui/playwright.config.ts');
    // No parallel config exists.
    const configs = deriveScoutConfigsForFile('pkg/test/scout/ui/helpers.ts', tmpRoot);
    expect(configs).toEqual(['pkg/test/scout/ui/playwright.config.ts']);
  });

  it('never crosses ui ↔ api scopes', () => {
    touch('pkg/test/scout/ui/playwright.config.ts');
    touch('pkg/test/scout/api/playwright.config.ts');

    const uiChange = deriveScoutConfigsForFile('pkg/test/scout/ui/fixtures/foo.ts', tmpRoot);
    expect(uiChange.every((c) => c.includes('/ui/'))).toBe(true);

    const apiChange = deriveScoutConfigsForFile('pkg/test/scout/api/helpers.ts', tmpRoot);
    expect(apiChange.every((c) => c.includes('/api/'))).toBe(true);
  });

  it('never crosses scout ↔ scout_<custom> scopes', () => {
    touch('pkg/test/scout/ui/playwright.config.ts');
    touch('pkg/test/scout_custom/ui/playwright.config.ts');

    expect(deriveScoutConfigsForFile('pkg/test/scout/ui/tests/a.spec.ts', tmpRoot)).toEqual([
      'pkg/test/scout/ui/playwright.config.ts',
    ]);
    expect(deriveScoutConfigsForFile('pkg/test/scout_custom/ui/tests/a.spec.ts', tmpRoot)).toEqual([
      'pkg/test/scout_custom/ui/playwright.config.ts',
    ]);
  });

  it('handles custom-server scopes (test/scout_<custom>) symmetrically', () => {
    touch('pkg/test/scout_oas_schema/ui/playwright.config.ts');
    expect(
      deriveScoutConfigsForFile('pkg/test/scout_oas_schema/ui/tests/a.spec.ts', tmpRoot)
    ).toEqual(['pkg/test/scout_oas_schema/ui/playwright.config.ts']);
  });

  it('maps .meta/(ui|api) manifests to the matching scope', () => {
    touch('pkg/test/scout/api/playwright.config.ts');
    touch('pkg/test/scout/api/parallel.playwright.config.ts');

    const configs = deriveScoutConfigsForFile('pkg/test/scout/.meta/api/standard.json', tmpRoot);
    expect(configs.sort()).toEqual([
      'pkg/test/scout/api/parallel.playwright.config.ts',
      'pkg/test/scout/api/playwright.config.ts',
    ]);
  });

  it('maps .meta under custom-server scopes too', () => {
    touch('pkg/test/scout_examples/ui/playwright.config.ts');
    const configs = deriveScoutConfigsForFile(
      'pkg/test/scout_examples/.meta/ui/standard.json',
      tmpRoot
    );
    expect(configs).toEqual(['pkg/test/scout_examples/ui/playwright.config.ts']);
  });

  it('maps an edit to the playwright config itself to that single config', () => {
    touch('pkg/test/scout/ui/playwright.config.ts');
    touch('pkg/test/scout/ui/parallel.playwright.config.ts');

    const configs = deriveScoutConfigsForFile('pkg/test/scout/ui/playwright.config.ts', tmpRoot);
    expect(configs.sort()).toEqual([
      'pkg/test/scout/ui/parallel.playwright.config.ts',
      'pkg/test/scout/ui/playwright.config.ts',
    ]);
  });

  it('handles deeply-nested package roots', () => {
    touch('x-pack/solutions/observability/plugins/foo/test/scout/ui/playwright.config.ts');
    expect(
      deriveScoutConfigsForFile(
        'x-pack/solutions/observability/plugins/foo/test/scout/ui/tests/a.spec.ts',
        tmpRoot
      )
    ).toEqual(['x-pack/solutions/observability/plugins/foo/test/scout/ui/playwright.config.ts']);
  });
});

describe('deriveScoutConfigsForFiles', () => {
  let tmpRoot: string;

  const touch = (rel: string) => {
    const abs = path.join(tmpRoot, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, '');
  };

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-tests-only-'));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('unions configs across multiple files and dedupes', () => {
    touch('a/test/scout/ui/playwright.config.ts');
    touch('a/test/scout/api/playwright.config.ts');
    touch('b/test/scout_custom/ui/playwright.config.ts');

    const result = deriveScoutConfigsForFiles(
      [
        'a/test/scout/ui/tests/x.spec.ts',
        'a/test/scout/ui/tests/y.spec.ts', // dedupes with previous
        'a/test/scout/api/helpers.ts',
        'b/test/scout_custom/ui/parallel_tests/z.spec.ts', // no parallel config -> dropped
      ],
      tmpRoot
    );

    expect([...result].sort()).toEqual([
      'a/test/scout/api/playwright.config.ts',
      'a/test/scout/ui/playwright.config.ts',
    ]);
  });

  it('returns an empty set when no file maps to a Scout scope', () => {
    expect(deriveScoutConfigsForFiles(['src/foo.ts', 'README.md'], tmpRoot).size).toBe(0);
  });
});
