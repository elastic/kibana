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

describe('fileConsumesKey', () => {
  it('matches plain property access', () => {
    expect(fileConsumesKey('await pageObjects.dashboard.goto();', 'dashboard')).toBe(true);
  });

  it('matches destructuring alongside other keys', () => {
    expect(fileConsumesKey('const { dashboard, lens } = pageObjects;', 'dashboard')).toBe(true);
    expect(fileConsumesKey('const { dashboard, lens } = pageObjects;', 'lens')).toBe(true);
  });

  it('does not match an unrelated key', () => {
    expect(fileConsumesKey('await pageObjects.dashboard.goto();', 'lens')).toBe(false);
    expect(fileConsumesKey('const { dashboard } = pageObjects;', 'lens')).toBe(false);
  });

  it('does not match a key name that only appears as a substring', () => {
    expect(fileConsumesKey('await pageObjects.dashboardWidget.goto();', 'dashboard')).toBe(false);
  });
});

describe('findScoutTestFiles', () => {
  it('finds .ts files under test/scout* dirs, excluding node_modules and target', () => {
    const files = findScoutTestFiles(FAKE_REPO_ROOT)
      .map((f) => Path.relative(FAKE_REPO_ROOT, f).split(Path.sep).join('/'))
      .sort();

    expect(files).toEqual(
      [
        'src/platform/plugins/shared/fake_plugin_a/test/scout/ui/fixtures/page_objects/spec_using_property.ts',
        'src/platform/plugins/shared/fake_plugin_b/test/scout/ui/spec_using_destructure.ts',
      ].sort()
    );
  });
});

describe('censusPageObjectConsumers', () => {
  beforeEach(() => {
    (findPackageForPath as jest.Mock).mockImplementation((_repoRoot: string, file: string) => {
      if (file.includes('fake_plugin_a')) return { id: 'fake-plugin-a' };
      if (file.includes('fake_plugin_b')) return { id: 'fake-plugin-b' };
      return undefined;
    });
  });

  it('counts files and attributes them to modules per key', () => {
    const files = findScoutTestFiles(FAKE_REPO_ROOT);
    const census = censusPageObjectConsumers(FAKE_REPO_ROOT, files, ['dashboard', 'lens']);

    expect(census).toEqual([
      { key: 'dashboard', fileCount: 2, modules: ['fake-plugin-a', 'fake-plugin-b'] },
      { key: 'lens', fileCount: 1, modules: ['fake-plugin-b'] },
    ]);
  });
});

describe('runAudit', () => {
  beforeEach(() => {
    (findPackageForPath as jest.Mock).mockImplementation((_repoRoot: string, file: string) => {
      if (file.includes('fake_plugin_a')) return { id: 'fake-plugin-a' };
      if (file.includes('fake_plugin_b')) return { id: 'fake-plugin-b' };
      return undefined;
    });
  });

  it('wires key extraction, file discovery, and the census together', () => {
    const census = runAudit(FAKE_REPO_ROOT, FAKE_PAGE_OBJECTS_INDEX);
    expect(census).toEqual([
      { key: 'dashboard', fileCount: 2, modules: ['fake-plugin-a', 'fake-plugin-b'] },
      { key: 'lens', fileCount: 1, modules: ['fake-plugin-b'] },
    ]);
  });
});
