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
import { execSync } from 'child_process';

let mockKibanaDir: string;

jest.mock('../utils', () => ({
  getKibanaDir: () => mockKibanaDir,
}));

import {
  getModuleLookup,
  findModuleForPath,
  getModuleDependencies,
  buildModuleDownstreamGraph,
  resetModuleLookupCache,
} from './module_lookup';
import { getAffectedModulesGit } from './strategy_git';
import { filterIgnoredFiles } from './utils';
import { UNCATEGORIZED_MODULE_ID } from './const';

function git(cwd: string, command: string): string {
  return execSync(`git ${command}`, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}

interface ModuleSpec {
  relDir: string;
  id: string;
  deps: string[];
}

function createModule(root: string, spec: ModuleSpec): void {
  const dir = path.join(root, spec.relDir);
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });

  fs.writeFileSync(
    path.join(dir, 'kibana.jsonc'),
    JSON.stringify(
      {
        type: 'shared-common',
        id: spec.id,
        owner: '@elastic/test',
        group: 'platform',
        visibility: 'shared',
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(dir, 'tsconfig.json'),
    JSON.stringify(
      {
        extends: '../../tsconfig.base.json',
        compilerOptions: {},
        kbn_references: spec.deps,
      },
      null,
      2
    )
  );

  fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'export {};\n');
}

function commitAll(root: string, message: string): string {
  git(root, 'add -A');
  git(root, `commit --allow-empty -m "${message}"`);
  return git(root, 'rev-parse HEAD').trim();
}

function addFileInModule(root: string, moduleRelDir: string, fileName: string): void {
  const filePath = path.join(root, moduleRelDir, 'src', fileName);
  fs.writeFileSync(filePath, `// generated ${fileName}\nexport const x = 1;\n`);
}

function modifyFile(root: string, relPath: string, content: string): void {
  fs.writeFileSync(path.join(root, relPath), content);
}

function removeFile(root: string, relPath: string): void {
  fs.unlinkSync(path.join(root, relPath));
}

/*
 * Test dependency graph:
 *
 *   @kbn/core  ←  @kbn/utils  ←  @kbn/my-plugin
 *                     ↑
 *   @kbn/logging ←  @kbn/analytics
 */
const MODULES: ModuleSpec[] = [
  { relDir: 'packages/core', id: '@kbn/core', deps: [] },
  { relDir: 'packages/utils', id: '@kbn/utils', deps: ['@kbn/core'] },
  { relDir: 'packages/logging', id: '@kbn/logging', deps: [] },
  { relDir: 'packages/analytics', id: '@kbn/analytics', deps: ['@kbn/logging', '@kbn/utils'] },
  {
    relDir: 'plugins/my-plugin',
    id: '@kbn/my-plugin',
    deps: ['@kbn/core', '@kbn/utils'],
  },
];

describe('filterIgnoredFiles', () => {
  const files = [
    'src/index.ts',
    'src/utils.ts',
    'docs/README.md',
    'docs/guide.md',
    'config.yml',
    '.github/workflows/ci.yml',
  ];

  it('returns all files when patterns is empty', () => {
    expect(filterIgnoredFiles(files, [])).toEqual(files);
  });

  it('filters files matching a single pattern', () => {
    expect(filterIgnoredFiles(files, ['**/*.md'])).toEqual([
      'src/index.ts',
      'src/utils.ts',
      'config.yml',
      '.github/workflows/ci.yml',
    ]);
  });

  it('filters files matching multiple patterns', () => {
    expect(filterIgnoredFiles(files, ['**/*.md', '**/*.yml'])).toEqual([
      'src/index.ts',
      'src/utils.ts',
    ]);
  });

  it('supports directory-scoped patterns', () => {
    expect(filterIgnoredFiles(files, ['docs/**'])).toEqual([
      'src/index.ts',
      'src/utils.ts',
      'config.yml',
      '.github/workflows/ci.yml',
    ]);
  });

  it('matches dotfiles when dot: true', () => {
    expect(filterIgnoredFiles(files, ['.github/**'])).toEqual([
      'src/index.ts',
      'src/utils.ts',
      'docs/README.md',
      'docs/guide.md',
      'config.yml',
    ]);
  });

  it('returns empty array when all files are filtered', () => {
    expect(filterIgnoredFiles(files, ['**/*'])).toEqual([]);
  });

  it('returns all files when no patterns match', () => {
    expect(filterIgnoredFiles(files, ['**/*.xyz'])).toEqual(files);
  });
});

describe('module_lookup', () => {
  let tmpDir: string;
  let baseCommit: string;

  beforeEach(() => {
    resetModuleLookupCache();

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'module-lookup-test-'));
    mockKibanaDir = tmpDir;

    git(tmpDir, 'init');
    git(tmpDir, 'config user.email "test@test.com"');
    git(tmpDir, 'config user.name "Test"');

    for (const spec of MODULES) {
      createModule(tmpDir, spec);
    }

    fs.mkdirSync(path.join(tmpDir, 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'scripts', 'build.sh'), '#!/bin/bash\n');

    baseCommit = commitAll(tmpDir, 'initial');
  });

  afterEach(() => {
    resetModuleLookupCache();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('getModuleLookup', () => {
    it('discovers all modules via kibana.jsonc', () => {
      const lookup = getModuleLookup();

      expect(lookup.byDir.size).toBe(MODULES.length);
      for (const spec of MODULES) {
        expect(lookup.byDir.get(spec.relDir)).toBe(spec.id);
      }
    });

    it('provides a reverse lookup by module ID', () => {
      const { byId } = getModuleLookup();

      for (const spec of MODULES) {
        expect(byId.get(spec.id)).toBe(spec.relDir);
      }
    });

    it('ignores directories without kibana.jsonc', () => {
      const { byDir } = getModuleLookup();
      const dirs = Array.from(byDir.keys());
      expect(dirs).not.toContain('scripts');
    });

    it('returns cached result on subsequent calls', () => {
      const first = getModuleLookup();
      const second = getModuleLookup();
      expect(first).toBe(second);
    });

    it('excludes kibana.jsonc files under __fixtures__ paths', () => {
      const fixtureDir = path.join(tmpDir, 'packages', 'core', '__fixtures__', 'mock-plugin');
      fs.mkdirSync(fixtureDir, { recursive: true });
      fs.writeFileSync(
        path.join(fixtureDir, 'kibana.jsonc'),
        JSON.stringify({ type: 'shared-common', id: '@kbn/fixture-mock-plugin' })
      );
      commitAll(tmpDir, 'add fixture module');

      resetModuleLookupCache();
      const { byDir, byId } = getModuleLookup();
      expect(byDir.has('packages/core/__fixtures__/mock-plugin')).toBe(false);
      expect(byId.has('@kbn/fixture-mock-plugin')).toBe(false);
      expect(byDir.size).toBe(MODULES.length);
    });

    it('handles kibana.jsonc without an id field gracefully', () => {
      const noIdDir = path.join(tmpDir, 'packages', 'no-id');
      fs.mkdirSync(noIdDir, { recursive: true });
      fs.writeFileSync(
        path.join(noIdDir, 'kibana.jsonc'),
        JSON.stringify({ type: 'shared-common', owner: '@elastic/test' })
      );
      commitAll(tmpDir, 'add module without id');

      resetModuleLookupCache();
      const { byDir } = getModuleLookup();
      expect(byDir.has('packages/no-id')).toBe(false);
      expect(byDir.size).toBe(MODULES.length);
    });
  });

  describe('findModuleForPath', () => {
    it('maps a deep file path to its containing module', () => {
      expect(findModuleForPath('packages/core/src/index.ts')).toBe('@kbn/core');
    });

    it('maps the module directory itself', () => {
      expect(findModuleForPath('packages/core')).toBe('@kbn/core');
    });

    it('resolves nested paths correctly (longest prefix wins)', () => {
      expect(findModuleForPath('packages/core/src/deep/file.ts')).toBe('@kbn/core');
    });

    it('returns UNCATEGORIZED_MODULE_ID for paths outside any module', () => {
      expect(findModuleForPath('scripts/build.sh')).toBe(UNCATEGORIZED_MODULE_ID);
      expect(findModuleForPath('README.md')).toBe(UNCATEGORIZED_MODULE_ID);
    });

    it('handles backslash paths (Windows-style)', () => {
      expect(findModuleForPath('packages\\core\\src\\index.ts')).toBe('@kbn/core');
    });
  });

  describe('getModuleDependencies', () => {
    it('reads kbn_references from tsconfig.json', () => {
      expect(getModuleDependencies('packages/utils')).toEqual(['@kbn/core']);
    });

    it('returns empty array for modules with no dependencies', () => {
      expect(getModuleDependencies('packages/core')).toEqual([]);
    });

    it('returns multiple dependencies', () => {
      const deps = getModuleDependencies('packages/analytics');
      expect(deps).toEqual(expect.arrayContaining(['@kbn/logging', '@kbn/utils']));
      expect(deps).toHaveLength(2);
    });

    it('returns empty array when tsconfig.json is missing', () => {
      const dir = path.join(tmpDir, 'packages', 'no-tsconfig');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'kibana.jsonc'),
        JSON.stringify({ type: 'shared-common', id: '@kbn/no-tsconfig' })
      );
      expect(getModuleDependencies('packages/no-tsconfig')).toEqual([]);
    });
  });

  describe('buildModuleDownstreamGraph', () => {
    it('builds correct downstream sets', () => {
      const graph = buildModuleDownstreamGraph();

      expect(graph.get('@kbn/core')).toEqual(new Set(['@kbn/utils', '@kbn/my-plugin']));
      expect(graph.get('@kbn/logging')).toEqual(new Set(['@kbn/analytics']));
      expect(graph.get('@kbn/utils')).toEqual(new Set(['@kbn/my-plugin', '@kbn/analytics']));
      expect(graph.get('@kbn/analytics')).toEqual(new Set());
      expect(graph.get('@kbn/my-plugin')).toEqual(new Set());
    });

    it('every module has an entry in the downstream map', () => {
      const graph = buildModuleDownstreamGraph();
      for (const spec of MODULES) {
        expect(graph.has(spec.id)).toBe(true);
      }
    });
  });

  describe('getAffectedModulesGit – file mutations', () => {
    it('detects an added file in a single module', () => {
      addFileInModule(tmpDir, 'packages/core', 'new_feature.ts');
      commitAll(tmpDir, 'add file in core');

      const affected = getAffectedModulesGit({ mergeBase: baseCommit, includeDownstream: false });
      expect(affected).toEqual(new Set(['@kbn/core']));
    });

    it('detects a modified file in a single module', () => {
      modifyFile(tmpDir, 'packages/utils/src/index.ts', 'export const changed = true;\n');
      commitAll(tmpDir, 'modify utils');

      const affected = getAffectedModulesGit({ mergeBase: baseCommit, includeDownstream: false });
      expect(affected).toEqual(new Set(['@kbn/utils']));
    });

    it('detects a removed file in a single module', () => {
      removeFile(tmpDir, 'packages/logging/src/index.ts');
      commitAll(tmpDir, 'remove file from logging');

      const affected = getAffectedModulesGit({ mergeBase: baseCommit, includeDownstream: false });
      expect(affected).toEqual(new Set(['@kbn/logging']));
    });

    it('includes downstream dependents when requested', () => {
      modifyFile(tmpDir, 'packages/core/src/index.ts', 'export const v2 = true;\n');
      commitAll(tmpDir, 'modify core');

      const affected = getAffectedModulesGit({ mergeBase: baseCommit, includeDownstream: true });
      expect(affected).toEqual(
        new Set(['@kbn/core', '@kbn/utils', '@kbn/my-plugin', '@kbn/analytics'])
      );
    });

    it('propagates downstream through the full chain', () => {
      modifyFile(tmpDir, 'packages/logging/src/index.ts', 'export const v2 = true;\n');
      commitAll(tmpDir, 'modify logging');

      const affected = getAffectedModulesGit({ mergeBase: baseCommit, includeDownstream: true });
      expect(affected).toEqual(new Set(['@kbn/logging', '@kbn/analytics']));
    });

    it('detects changes across multiple modules', () => {
      modifyFile(tmpDir, 'packages/core/src/index.ts', 'export const v2 = true;\n');
      addFileInModule(tmpDir, 'packages/logging', 'logger_v2.ts');
      commitAll(tmpDir, 'modify core and logging');

      const affected = getAffectedModulesGit({ mergeBase: baseCommit, includeDownstream: false });
      expect(affected).toEqual(new Set(['@kbn/core', '@kbn/logging']));
    });

    it('maps non-module files to [uncategorized]', () => {
      modifyFile(tmpDir, 'scripts/build.sh', '#!/bin/bash\necho "v2"\n');
      commitAll(tmpDir, 'modify non-module file');

      const affected = getAffectedModulesGit({ mergeBase: baseCommit, includeDownstream: false });
      expect(affected).toEqual(new Set([UNCATEGORIZED_MODULE_ID]));
    });
  });

  describe('getAffectedModulesGit – ignoreUncategorizedChanges', () => {
    it('excludes [uncategorized] when ignoreUncategorizedChanges is true and only non-module files change', () => {
      modifyFile(tmpDir, 'scripts/build.sh', '#!/bin/bash\necho "v2"\n');
      commitAll(tmpDir, 'modify non-module file');

      const affected = getAffectedModulesGit({
        mergeBase: baseCommit,
        includeDownstream: false,
        ignoreUncategorizedChanges: true,
      });
      expect(affected).toEqual(new Set());
    });

    it('excludes [uncategorized] when ignoreUncategorizedChanges is true and mixed changes (module + non-module)', () => {
      modifyFile(tmpDir, 'scripts/build.sh', '#!/bin/bash\necho "v2"\n');
      addFileInModule(tmpDir, 'packages/core', 'feature.ts');
      commitAll(tmpDir, 'modify non-module and add to core');

      const affected = getAffectedModulesGit({
        mergeBase: baseCommit,
        includeDownstream: false,
        ignoreUncategorizedChanges: true,
      });
      expect(affected).toEqual(new Set(['@kbn/core']));
    });

    it('includes [uncategorized] when ignoreUncategorizedChanges is false (default)', () => {
      modifyFile(tmpDir, 'scripts/build.sh', '#!/bin/bash\necho "v2"\n');
      commitAll(tmpDir, 'modify non-module file');

      const affected = getAffectedModulesGit({
        mergeBase: baseCommit,
        includeDownstream: false,
        ignoreUncategorizedChanges: false,
      });
      expect(affected).toEqual(new Set([UNCATEGORIZED_MODULE_ID]));
    });
  });

  describe('getAffectedModulesGit – random mutations', () => {
    const ITERATIONS = 5;

    for (let i = 0; i < ITERATIONS; i++) {
      it(`random mutation round ${i + 1}`, () => {
        resetModuleLookupCache();

        const mutatedModules = new Set<string>();
        const mutations: string[] = [];

        for (const spec of MODULES) {
          const roll = Math.random();
          if (roll < 0.3) {
            const name = `random_${i}_${Math.floor(Math.random() * 10000)}.ts`;
            addFileInModule(tmpDir, spec.relDir, name);
            mutatedModules.add(spec.id);
            mutations.push(`add ${spec.relDir}/src/${name}`);
          } else if (roll < 0.5) {
            modifyFile(
              tmpDir,
              `${spec.relDir}/src/index.ts`,
              `export const round${i} = ${Math.random()};\n`
            );
            mutatedModules.add(spec.id);
            mutations.push(`modify ${spec.relDir}/src/index.ts`);
          }
        }

        if (mutatedModules.size === 0) {
          addFileInModule(tmpDir, MODULES[0].relDir, `fallback_${i}.ts`);
          mutatedModules.add(MODULES[0].id);
          mutations.push(`add ${MODULES[0].relDir}/src/fallback_${i}.ts`);
        }

        commitAll(tmpDir, `random mutations round ${i}`);

        const affected = getAffectedModulesGit({ mergeBase: baseCommit, includeDownstream: false });

        for (const expectedId of mutatedModules) {
          expect(affected).toContain(expectedId);
        }

        for (const affectedId of affected) {
          expect(mutatedModules).toContain(affectedId);
        }
      });
    }
  });

  describe('getAffectedModulesGit – dynamic module changes', () => {
    it('detects a newly added module', () => {
      createModule(tmpDir, {
        relDir: 'packages/brand-new',
        id: '@kbn/brand-new',
        deps: ['@kbn/core'],
      });
      commitAll(tmpDir, 'add brand-new module');

      resetModuleLookupCache();
      const lookup = getModuleLookup();
      expect(lookup.byDir.has('packages/brand-new')).toBe(true);

      const affected = getAffectedModulesGit({ mergeBase: baseCommit, includeDownstream: false });
      expect(affected.has('@kbn/brand-new')).toBe(true);
    });

    it('handles a removed module gracefully', () => {
      fs.rmSync(path.join(tmpDir, 'packages', 'logging'), { recursive: true, force: true });
      commitAll(tmpDir, 'remove logging module');

      resetModuleLookupCache();

      const lookup = getModuleLookup();
      expect(lookup.byDir.has('packages/logging')).toBe(false);

      const affected = getAffectedModulesGit({ mergeBase: baseCommit, includeDownstream: false });
      expect(affected.has('@kbn/logging')).toBe(false);
    });
  });

  describe('comparison base', () => {
    it('uses a specific commit as merge base', () => {
      modifyFile(tmpDir, 'packages/core/src/index.ts', 'export const v2 = true;\n');
      const midCommit = commitAll(tmpDir, 'modify core');

      modifyFile(tmpDir, 'packages/utils/src/index.ts', 'export const v2 = true;\n');
      commitAll(tmpDir, 'modify utils');

      const affectedFromBase = getAffectedModulesGit({
        mergeBase: baseCommit,
        includeDownstream: false,
      });
      expect(affectedFromBase).toEqual(new Set(['@kbn/core', '@kbn/utils']));

      resetModuleLookupCache();
      const affectedFromMid = getAffectedModulesGit({
        mergeBase: midCommit,
        includeDownstream: false,
      });
      expect(affectedFromMid).toEqual(new Set(['@kbn/utils']));
    });

    it('supports HEAD~N syntax', () => {
      modifyFile(tmpDir, 'packages/core/src/index.ts', 'export const v2 = true;\n');
      commitAll(tmpDir, 'commit 1');

      modifyFile(tmpDir, 'packages/utils/src/index.ts', 'export const v2 = true;\n');
      commitAll(tmpDir, 'commit 2');

      resetModuleLookupCache();
      const affectedLastCommit = getAffectedModulesGit({
        mergeBase: 'HEAD~1',
        includeDownstream: false,
      });
      expect(affectedLastCommit).toEqual(new Set(['@kbn/utils']));
    });
  });

  describe('getAffectedModulesGit – ignorePatterns', () => {
    it('excludes files matching a single glob pattern', () => {
      addFileInModule(tmpDir, 'packages/core', 'feature.ts');
      fs.writeFileSync(path.join(tmpDir, 'packages', 'core', 'README.md'), '# Core\n');
      addFileInModule(tmpDir, 'packages/utils', 'helper.ts');
      commitAll(tmpDir, 'add files in core and utils');

      const affected = getAffectedModulesGit({
        mergeBase: baseCommit,
        includeDownstream: false,
        ignorePatterns: ['**/*.md'],
      });
      expect(affected).toEqual(new Set(['@kbn/core', '@kbn/utils']));
    });

    it('excludes an entire module when all its changed files are ignored', () => {
      fs.writeFileSync(path.join(tmpDir, 'packages', 'core', 'README.md'), '# Core docs\n');
      addFileInModule(tmpDir, 'packages/utils', 'helper.ts');
      commitAll(tmpDir, 'add md to core and ts to utils');

      const affected = getAffectedModulesGit({
        mergeBase: baseCommit,
        includeDownstream: false,
        ignorePatterns: ['**/*.md'],
      });
      expect(affected).toEqual(new Set(['@kbn/utils']));
    });

    it('supports multiple ignore patterns', () => {
      fs.writeFileSync(path.join(tmpDir, 'packages', 'core', 'README.md'), '# Core docs\n');
      fs.writeFileSync(path.join(tmpDir, 'packages', 'utils', 'notes.txt'), 'notes\n');
      addFileInModule(tmpDir, 'packages/logging', 'logger_v2.ts');
      commitAll(tmpDir, 'add md, txt, and ts files');

      const affected = getAffectedModulesGit({
        mergeBase: baseCommit,
        includeDownstream: false,
        ignorePatterns: ['**/*.md', '**/*.txt'],
      });
      expect(affected).toEqual(new Set(['@kbn/logging']));
    });

    it('supports directory-scoped patterns', () => {
      addFileInModule(tmpDir, 'packages/core', 'feature.ts');
      addFileInModule(tmpDir, 'packages/utils', 'helper.ts');
      commitAll(tmpDir, 'add ts files in core and utils');

      const affected = getAffectedModulesGit({
        mergeBase: baseCommit,
        includeDownstream: false,
        ignorePatterns: ['packages/core/**'],
      });
      expect(affected).toEqual(new Set(['@kbn/utils']));
    });

    it('returns empty set when all changed files are ignored', () => {
      fs.writeFileSync(path.join(tmpDir, 'packages', 'core', 'README.md'), '# Core\n');
      commitAll(tmpDir, 'docs only');

      const affected = getAffectedModulesGit({
        mergeBase: baseCommit,
        includeDownstream: false,
        ignorePatterns: ['**/*.md'],
      });
      expect(affected.size).toBe(0);
    });

    it('has no effect when patterns match nothing', () => {
      addFileInModule(tmpDir, 'packages/core', 'feature.ts');
      commitAll(tmpDir, 'add ts file');

      const affected = getAffectedModulesGit({
        mergeBase: baseCommit,
        includeDownstream: false,
        ignorePatterns: ['**/*.xyz'],
      });
      expect(affected).toEqual(new Set(['@kbn/core']));
    });

    it('empty ignorePatterns array has no effect', () => {
      addFileInModule(tmpDir, 'packages/core', 'feature.ts');
      commitAll(tmpDir, 'add ts file');

      const withEmpty = getAffectedModulesGit({
        mergeBase: baseCommit,
        includeDownstream: false,
        ignorePatterns: [],
      });
      const without = getAffectedModulesGit({ mergeBase: baseCommit, includeDownstream: false });
      expect(withEmpty).toEqual(without);
    });

    it('works with downstream resolution after filtering', () => {
      fs.writeFileSync(path.join(tmpDir, 'packages', 'core', 'README.md'), '# Core\n');
      addFileInModule(tmpDir, 'packages/logging', 'logger_v2.ts');
      commitAll(tmpDir, 'docs in core, ts in logging');

      const affected = getAffectedModulesGit({
        mergeBase: baseCommit,
        includeDownstream: true,
        ignorePatterns: ['**/*.md'],
      });
      expect(affected).toContain('@kbn/logging');
      expect(affected).toContain('@kbn/analytics');
      expect(affected).not.toContain('@kbn/core');
    });
  });
});
