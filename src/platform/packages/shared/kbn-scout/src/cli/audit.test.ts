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
  extractPageObjectKeys,
  extractPageObjectKeysOrThrow,
  fileConsumesKey,
  findScoutTestFiles,
  censusPageObjectConsumers,
  runAudit,
} from './audit';

jest.mock('@kbn/repo-packages', () => ({
  findPackageForPath: jest.fn(),
}));

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

describe('runAudit', () => {
  beforeEach(() => {
    (findPackageForPath as jest.Mock).mockImplementation((_repoRoot: string, file: string) => {
      if (file.includes('fake_plugin_a')) return { id: 'fake-plugin-a' };
      if (file.includes('fake_plugin_b')) return { id: 'fake-plugin-b' };
      if (file.includes('kbn-scout-fake')) return { id: '@kbn/scout-fake' };
      return undefined;
    });
  });

  it('wires key extraction, file discovery, and the census together', () => {
    const census = runAudit(FAKE_REPO_ROOT, FAKE_PAGE_OBJECTS_INDEX);
    expect(census).toEqual([
      { key: 'dashboard', fileCount: 2, modules: ['fake-plugin-a', 'fake-plugin-b'] },
      { key: 'lens', fileCount: 2, modules: ['@kbn/scout-fake', 'fake-plugin-b'] },
    ]);
  });
});
