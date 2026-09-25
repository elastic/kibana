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
import { findPackageForPath } from '@kbn/repo-packages';
import {
  diffArgs,
  isRuntimeUpdatable,
  parseServerArgs,
  summarizeConfigSets,
  type ConfigSetOverrides,
} from './audit_config_sets';
import {
  findDuplicateClassNames,
  findAllScoutFiles,
  formatAuditText,
  extractPageObjectKeys,
  extractPageObjectKeysOrThrow,
  fileConsumesKey,
  findScoutTestFiles,
  censusPageObjectConsumers,
  runAudit,
} from './audit';

jest.mock('@kbn/repo-packages', () => ({
  findPackageForPath: jest.fn(),
  getPackages: jest.fn(() => []),
}));

// The config set check imports real server configs; the fixture repo has none,
// so the report gets an empty section here and the pure parts are tested below.
jest.mock('./audit_config_sets', () => ({
  ...jest.requireActual('./audit_config_sets'),
  auditConfigSets: jest.fn(async () => ({
    sets: [],
    runtimeOnly: [],
    bootFeatureFlags: [],
    identical: [],
    subsets: [],
    runtimeKeys: [],
  })),
}));

const emptyConfigSets = {
  sets: [],
  runtimeOnly: [],
  bootFeatureFlags: [],
  identical: [],
  subsets: [],
  runtimeKeys: [],
};

const FIXTURES_DIR = Path.join(__dirname, '__fixtures__', 'audit');
const FAKE_REPO_ROOT = Path.join(FIXTURES_DIR, 'fake_repo');
const FAKE_PAGE_OBJECTS_INDEX = Path.join(FIXTURES_DIR, 'fake_page_objects_index.ts');

describe('extractPageObjectKeys', () => {
  it('extracts fixture keys from the createCorePageObjects return block', () => {
    const source = Fs.readFileSync(FAKE_PAGE_OBJECTS_INDEX, 'utf8');
    expect(extractPageObjectKeys(source)).toEqual(['dashboard', 'lens']);
  });

  it('returns an empty array when the function is not found', () => {
    expect(extractPageObjectKeys('export const foo = 1;')).toEqual([]);
  });
});

describe('extractPageObjectKeysOrThrow', () => {
  it('throws instead of silently reporting zero keys', () => {
    expect(() => extractPageObjectKeysOrThrow('export const foo = 1;', 'index.ts')).toThrow(
      /found no 'key: createLazyPageObject/
    );
  });
});

describe('fileConsumesKey', () => {
  it('matches plain property access', () => {
    expect(fileConsumesKey('await pageObjects.dashboard.goto();', 'dashboard')).toBe(true);
  });

  it('matches property access on an extended or member fixture', () => {
    expect(fileConsumesKey('await myPageObjects.dashboard.goto();', 'dashboard')).toBe(true);
    expect(fileConsumesKey('await this.pageObjects.dashboard.goto();', 'dashboard')).toBe(true);
  });

  it('matches destructuring alongside other keys', () => {
    expect(fileConsumesKey('const { dashboard, lens } = pageObjects;', 'dashboard')).toBe(true);
    expect(fileConsumesKey('const { dashboard, lens } = pageObjects;', 'lens')).toBe(true);
  });

  it('matches destructuring split across lines', () => {
    const content = ['const {', '  dashboard,', '  lens,', '} = pageObjects;'].join('\n');
    expect(fileConsumesKey(content, 'dashboard')).toBe(true);
    expect(fileConsumesKey(content, 'lens')).toBe(true);
  });

  it('matches a destructured key that is renamed locally', () => {
    expect(fileConsumesKey('const { dashboard: dash } = pageObjects;', 'dashboard')).toBe(true);
    expect(fileConsumesKey('const { dashboard: dash } = pageObjects;', 'dash')).toBe(false);
  });

  it('does not match an unrelated key', () => {
    expect(fileConsumesKey('await pageObjects.dashboard.goto();', 'lens')).toBe(false);
    expect(fileConsumesKey('const { dashboard } = pageObjects;', 'lens')).toBe(false);
  });

  it('does not match a key name that only appears as a substring', () => {
    expect(fileConsumesKey('await pageObjects.dashboardWidget.goto();', 'dashboard')).toBe(false);
  });

  it('does not match the key inside comments or string literals', () => {
    const content = [
      `// pageObjects.dashboard is documented here but not used`,
      `const example = 'pageObjects.dashboard';`,
      `await expect(results.filter({ hasText: 'type: dashboard' })).toBeVisible();`,
      `await pageObjects.globalSearch.clickOnOption(0);`,
    ].join('\n');

    expect(fileConsumesKey(content, 'dashboard')).toBe(false);
    expect(fileConsumesKey(content, 'globalSearch')).toBe(true);
  });

  it('parses .ts files as TypeScript so TS-only syntax does not hide later accesses', () => {
    const content = [
      `const identity = <T>(value: T) => value;`,
      `const size = <number>someValue;`,
      `await pageObjects.dashboard.goto();`,
    ].join('\n');

    expect(fileConsumesKey(content, 'dashboard')).toBe(true);
  });

  it('does not count type-only references', () => {
    // `typeof pageObjects.dashboard` parses as a type query over a qualified
    // name, not a property access expression, so it never reaches the runtime
    // branch. Pinned here so the behaviour is explicit.
    const content = [
      `type Dashboard = typeof pageObjects.dashboard;`,
      `type Lens = PageObjects['lens'];`,
      `function useIt(dashboard: typeof pageObjects.dashboard) {}`,
    ].join('\n');

    expect(fileConsumesKey(content, 'dashboard')).toBe(false);
    expect(fileConsumesKey(content, 'lens')).toBe(false);
  });

  it('does not treat a typed function parameter as a pageObjects destructure', () => {
    const content = [
      `export async function openInlineEditor({ dashboard, lens }: DashboardAndLens) {`,
      `  await dashboard.clickPanelAction('editPanel');`,
      `}`,
      ``,
      `export const helper = (pageObjects: PageObjects) => pageObjects;`,
    ].join('\n');

    expect(fileConsumesKey(content, 'dashboard')).toBe(false);
  });
});

describe('findScoutTestFiles', () => {
  it('finds .ts files under test/scout* dirs and solution package src/playwright, excluding node_modules and target', () => {
    const files = findScoutTestFiles(FAKE_REPO_ROOT)
      .map((f) => Path.relative(FAKE_REPO_ROOT, f).split(Path.sep).join('/'))
      .sort();

    expect(files).toEqual(
      [
        'src/platform/plugins/shared/fake_plugin_a/test/scout/ui/fixtures/page_objects/fake_solution_page.ts',
        'src/platform/plugins/shared/fake_plugin_a/test/scout/ui/fixtures/page_objects/spec_using_property.ts',
        'src/platform/plugins/shared/fake_plugin_b/test/scout/ui/spec_using_destructure.ts',
        'x-pack/solutions/fake/packages/kbn-scout-fake/src/playwright/page_objects/uses_core.ts',
      ].sort()
    );
  });

  it("excludes this command's own __fixtures__ tree when walking from a repo root", () => {
    // Regression: the fixture tree below lives under a real `test/scout*`
    // path, so walking the actual repo root counted these synthetic specs as
    // consumers of `dashboard` and `lens`.
    const files = findScoutTestFiles(Path.join(__dirname, '..'));
    expect(files.filter((f) => f.includes('__fixtures__'))).toEqual([]);
  });
});

describe('censusPageObjectConsumers', () => {
  beforeEach(() => {
    (findPackageForPath as jest.Mock).mockImplementation((_repoRoot: string, file: string) => {
      if (file.includes('fake_plugin_a')) return { id: 'fake-plugin-a' };
      if (file.includes('fake_plugin_b')) return { id: 'fake-plugin-b' };
      if (file.includes('kbn-scout-fake')) return { id: '@kbn/scout-fake' };
      return undefined;
    });
  });

  it('counts files and attributes them to modules per key', () => {
    const files = findScoutTestFiles(FAKE_REPO_ROOT);
    const census = censusPageObjectConsumers(FAKE_REPO_ROOT, files, ['dashboard', 'lens']);

    expect(census).toEqual([
      { key: 'dashboard', fileCount: 2, modules: ['fake-plugin-a', 'fake-plugin-b'] },
      { key: 'lens', fileCount: 2, modules: ['@kbn/scout-fake', 'fake-plugin-b'] },
    ]);
  });
});

describe('findDuplicateClassNames', () => {
  beforeEach(() => {
    (findPackageForPath as jest.Mock).mockImplementation((_repoRoot: string, file: string) => {
      if (file.includes('fake_plugin_a')) return { id: 'fake-plugin-a' };
      if (file.includes('fake_plugin_b')) return { id: 'fake-plugin-b' };
      if (file.includes('kbn-scout-fake')) return { id: '@kbn/scout-fake' };
      return undefined;
    });
  });

  it('reports an exported class name declared in two modules, once, with both modules', () => {
    const duplicates = findDuplicateClassNames(FAKE_REPO_ROOT, findAllScoutFiles(FAKE_REPO_ROOT));
    expect(duplicates).toEqual([
      { className: 'FakeSolutionPage', modules: ['@kbn/scout-fake', 'fake-plugin-a'] },
    ]);
  });
});

describe('formatAuditText', () => {
  it('lists only keys and classes that need a look, with the reason', () => {
    const text = formatAuditText({
      census: [
        { key: 'overlays', fileCount: 0, modules: [] },
        { key: 'listingTable', fileCount: 1, modules: ['examples-plugin'] },
        { key: 'unifiedTabs', fileCount: 45, modules: ['@kbn/discover-plugin'] },
        { key: 'dashboard', fileCount: 128, modules: ['a', 'b'] },
      ],
      duplicateClassNames: [
        { className: 'SavedObjectsManagementPage', modules: ['spaces', 'tagging'] },
      ],
      configSets: {
        ...emptyConfigSets,
        runtimeOnly: ['flags_only (stateful/classic.stateful.config.ts)'],
        identical: [['a (stateful/x.config.ts)', 'b (stateful/x.config.ts)']],
        subsets: [
          { set: 'small (stateful/x.config.ts)', of: 'big (stateful/x.config.ts)' },
          { set: 'small (stateful/x.config.ts)', of: 'bigger (stateful/x.config.ts)' },
        ],
      },
    });

    expect(text).toContain('`pageObjects.overlays` has no consumer');
    expect(text).toContain('`pageObjects.listingTable` is used by one file (examples-plugin)');
    expect(text).toContain(
      '`pageObjects.unifiedTabs` used in 45 files, all in @kbn/discover-plugin'
    );
    expect(text).toContain('`SavedObjectsManagementPage` in spaces, tagging');
    expect(text).toContain('flags_only (stateful/classic.stateful.config.ts)');
    expect(text).toContain('a (stateful/x.config.ts) = b (stateful/x.config.ts)');
    expect(text).toContain(
      'small (stateful/x.config.ts) is a subset of: big (stateful/x.config.ts), bigger (stateful/x.config.ts)'
    );
    expect(text).not.toContain('dashboard');
  });

  it('says so when there is nothing to report', () => {
    const text = formatAuditText({
      census: [{ key: 'dashboard', fileCount: 128, modules: ['a', 'b'] }],
      duplicateClassNames: [],
      configSets: emptyConfigSets,
    });
    expect(text).toContain('No findings.');
  });
});

describe('runAudit', () => {
  beforeEach(() => {
    (findPackageForPath as jest.Mock).mockImplementation((_repoRoot: string, file: string) => {
      if (file.includes('fake_plugin_a')) return { id: 'fake-plugin-a' };
      if (file.includes('fake_plugin_b')) return { id: 'fake-plugin-b' };
      if (file.includes('kbn-scout-fake')) return { id: '@kbn/scout-fake' };
      return undefined;
    });
  });

  it('wires key extraction, file discovery, the census and duplicate detection together', async () => {
    const report = await runAudit(FAKE_REPO_ROOT, FAKE_PAGE_OBJECTS_INDEX);
    expect(report.census).toEqual([
      { key: 'dashboard', fileCount: 2, modules: ['fake-plugin-a', 'fake-plugin-b'] },
      { key: 'lens', fileCount: 2, modules: ['@kbn/scout-fake', 'fake-plugin-b'] },
    ]);
    expect(report.duplicateClassNames.map((d) => d.className)).toEqual(['FakeSolutionPage']);
  });
});

describe('config set audit, pure parts', () => {
  const set = (name: string, kibana: Record<string, string>, extra?: Partial<ConfigSetOverrides>) =>
    ({
      name,
      flavor: 'stateful',
      file: 'classic.stateful.config.ts',
      kibana,
      elasticsearch: {},
      other: [],
      ...extra,
    } as ConfigSetOverrides);

  it('parses --key=value and key=value args and joins repeated keys', () => {
    expect(parseServerArgs(['--a.b=1', 'c=x', 'c=y', 'not-an-arg'])).toEqual({
      'a.b': '1',
      c: 'x,y',
    });
  });

  it('diffs only changed or added keys', () => {
    expect(diffArgs({ a: '1', b: '2', c: '3' }, { a: '1', b: '9' })).toEqual({ b: '2', c: '3' });
  });

  it('treats a key under a runtime path as runtime updatable', () => {
    const keys = ['feature_flags.overrides', 'xpack.fleet.experimentalFeatures'];
    expect(isRuntimeUpdatable('feature_flags.overrides.myFlag', keys)).toBe(true);
    expect(isRuntimeUpdatable('xpack.fleet.experimentalFeatures', keys)).toBe(true);
    expect(isRuntimeUpdatable('xpack.security.session.idleTimeout', keys)).toBe(false);
    expect(isRuntimeUpdatable('feature_flags_other', keys)).toBe(false);
  });

  it('finds runtime-only sets, boot feature flags, identical sets and subsets', () => {
    const runtimeKeys = ['feature_flags.overrides'];
    const report = summarizeConfigSets(
      [
        set('flags_only', { 'feature_flags.overrides.x': 'true' }),
        set('flags_plus_boot', { 'feature_flags.overrides.x': 'true', 'server.foo': '1' }),
        set('twin_a', { 'server.foo': '1' }),
        set('twin_b', { 'server.foo': '1' }),
        set('big', { 'server.foo': '1', 'server.bar': '2' }),
        set(
          'other_flavor',
          { 'server.foo': '1' },
          { flavor: 'serverless', file: 'search.serverless.config.ts' }
        ),
        set('with_docker', { 'server.foo': '1' }, { other: ['docker servers'] }),
      ],
      runtimeKeys
    );

    expect(report.runtimeOnly).toEqual(['flags_only (stateful/classic.stateful.config.ts)']);
    expect(report.bootFeatureFlags).toEqual([
      'flags_only (stateful/classic.stateful.config.ts)',
      'flags_plus_boot (stateful/classic.stateful.config.ts)',
    ]);
    expect(report.identical).toEqual([
      [
        'twin_a (stateful/classic.stateful.config.ts)',
        'twin_b (stateful/classic.stateful.config.ts)',
      ],
    ]);
    // subsets: same flavor and file, not identical, and neither side has non-arg differences
    expect(report.subsets).toEqual([
      {
        set: 'flags_only (stateful/classic.stateful.config.ts)',
        of: 'flags_plus_boot (stateful/classic.stateful.config.ts)',
      },
      {
        set: 'twin_a (stateful/classic.stateful.config.ts)',
        of: 'flags_plus_boot (stateful/classic.stateful.config.ts)',
      },
      {
        set: 'twin_a (stateful/classic.stateful.config.ts)',
        of: 'big (stateful/classic.stateful.config.ts)',
      },
      {
        set: 'twin_b (stateful/classic.stateful.config.ts)',
        of: 'flags_plus_boot (stateful/classic.stateful.config.ts)',
      },
      {
        set: 'twin_b (stateful/classic.stateful.config.ts)',
        of: 'big (stateful/classic.stateful.config.ts)',
      },
    ]);
  });
});
