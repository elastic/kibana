/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as fs from 'fs';
import * as path from 'path';
import * as JSON5 from 'json5';
import { getKibanaDir } from '../../utils.ts';
import { getModuleLookup } from '../../affected-packages/module_lookup.ts';
import * as affectedPackages from '../../affected-packages/index.ts';
import {
  FTR_EXCLUDED_MODULES,
  getFtrRelevantModules,
  isPlatformOwnedFtrConfig,
  resolveAffectedFtrDomains,
  shouldSkipFtrTests,
} from './selective_ftr.ts';

/**
 * Instead of asserting specific IDs in/out of the list (which just mirrors the
 * list), these invariants derive correctness from the repo: every excluded
 * module must exist, be devOnly, not look like FTR framework, and not be
 * imported by FTR runtime packages.
 */
describe('FTR_EXCLUDED_MODULES invariants', () => {
  const kibanaDir = getKibanaDir();
  const { byId } = getModuleLookup();

  it('every entry resolves to an existing module', () => {
    const missing = [...FTR_EXCLUDED_MODULES].filter((id) => !byId.has(id));
    expect(missing).toEqual([]);
  });

  it('every entry is devOnly (runtime plugins/libraries load into FTR-booted Kibana)', () => {
    const runtimeModules: string[] = [];
    for (const id of FTR_EXCLUDED_MODULES) {
      const dir = byId.get(id);
      if (!dir) continue;
      const manifest = JSON5.parse(
        fs.readFileSync(path.join(kibanaDir, dir, 'kibana.jsonc'), 'utf8')
      );
      if (!manifest.devOnly) runtimeModules.push(id);
    }
    expect(runtimeModules).toEqual([]);
  });

  it('no entry looks like an FTR framework or suite package', () => {
    const suspicious = [...FTR_EXCLUDED_MODULES].filter(
      (id) =>
        id === '@kbn/test' ||
        id.includes('ftr') ||
        id.includes('test-suites') ||
        id.includes('journeys')
    );
    expect(suspicious).toEqual([]);
  });

  it('no entry is imported by FTR runtime packages', () => {
    // Packages executed as part of every FTR run. An excluded module imported
    // here (outside its tests) can change FTR behavior and must not be skipped.
    const FTR_RUNTIME_MODULES = [
      '@kbn/test',
      '@kbn/ftr-common-functional-services',
      '@kbn/ftr-common-functional-ui-services',
    ];

    const offenders: Record<string, string[]> = {};
    for (const runtimeId of FTR_RUNTIME_MODULES) {
      const dir = byId.get(runtimeId);
      expect(dir).toBeDefined();
      for (const file of walkSourceFiles(path.join(kibanaDir, dir!))) {
        const content = fs.readFileSync(file, 'utf8');
        for (const excluded of FTR_EXCLUDED_MODULES) {
          if (content.includes(`'${excluded}'`) || content.includes(`"${excluded}"`)) {
            (offenders[excluded] ??= []).push(path.relative(kibanaDir, file));
          }
        }
      }
    }
    expect(offenders).toEqual({});
  });
});

const SKIPPED_DIRS = new Set([
  'node_modules',
  'target',
  '__snapshots__',
  '__mocks__',
  '__fixtures__',
]);

function walkSourceFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) out.push(...walkSourceFiles(full));
    } else if (
      /\.(ts|tsx|js|jsx)$/.test(entry.name) &&
      !/\.test\.(ts|tsx|js|jsx)$/.test(entry.name)
    ) {
      out.push(full);
    }
  }
  return out;
}

describe('shouldSkipFtrTests', () => {
  it('returns false for an empty changed-files list', () => {
    expect(shouldSkipFtrTests(new Set(['@kbn/scout']), [])).toBe(false);
  });

  it('returns true when all affected modules are excluded', () => {
    expect(
      shouldSkipFtrTests(new Set(['@kbn/scout', '@kbn/test-eui-helpers']), [
        'src/platform/packages/shared/kbn-scout/src/index.ts',
      ])
    ).toBe(true);
  });

  it('returns true for dependency ownership and Renovate changes', () => {
    expect(
      shouldSkipFtrTests(new Set(['@kbn/dependency-ownership']), [
        'packages/kbn-dependency-ownership/src/rule.ts',
        'renovate.json',
      ])
    ).toBe(true);
  });

  it('returns false when any affected module is not excluded', () => {
    expect(
      shouldSkipFtrTests(new Set(['@kbn/scout', '@kbn/dashboard-plugin']), [
        'src/platform/packages/shared/kbn-scout/src/index.ts',
        'src/platform/plugins/shared/dashboard/public/plugin.ts',
      ])
    ).toBe(false);
  });

  it('returns false when a critical path is touched even if modules are excluded', () => {
    expect(
      shouldSkipFtrTests(new Set(['@kbn/scout']), [
        'src/platform/packages/shared/kbn-scout/src/index.ts',
        'pnpm-lock.yaml',
      ])
    ).toBe(false);
    expect(
      shouldSkipFtrTests(new Set(['@kbn/scout']), [
        '.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml',
      ])
    ).toBe(false);
  });

  it('returns true for docs / CI / ownership-only diffs with no categorized modules', () => {
    expect(
      shouldSkipFtrTests(new Set(), [
        'docs/extend/testing.md',
        'fleet_packages.json',
        '.buildkite/pipeline-resource-definitions/kibana-es-snapshots.yml',
        'CODEOWNERS',
      ])
    ).toBe(true);
  });

  it('returns true for i18nrc-only diffs', () => {
    expect(shouldSkipFtrTests(new Set(), ['x-pack/.i18nrc.json', '.i18nrc.json'])).toBe(true);
  });

  it('returns false for uncategorized diffs that are not irrelevant noise', () => {
    expect(shouldSkipFtrTests(new Set(), ['some_random_root_script.sh'])).toBe(false);
  });

  it('returns false when FTR manifests change inside .buildkite', () => {
    expect(
      shouldSkipFtrTests(new Set(), ['.buildkite/ftr-manifests/ftr_security_stateful_configs.yml'])
    ).toBe(false);
  });

  it('returns false for config/serverless.yml', () => {
    expect(shouldSkipFtrTests(new Set(), ['config/serverless.yml'])).toBe(false);
  });

  it('returns true for a Scout-only diff even when the owning module is not excluded', () => {
    expect(
      shouldSkipFtrTests(new Set(['@kbn/discover-plugin']), [
        'src/platform/plugins/shared/discover/test/scout/core/api/fixtures/constants.ts',
        'src/platform/plugins/shared/discover/test/scout/core/ui/tests/foo.spec.ts',
      ])
    ).toBe(true);
  });

  it('returns false when a Scout diff is mixed with non-Scout module changes', () => {
    expect(
      shouldSkipFtrTests(new Set(['@kbn/discover-plugin']), [
        'src/platform/plugins/shared/discover/test/scout/core/ui/tests/foo.spec.ts',
        'src/platform/plugins/shared/discover/public/application/main.tsx',
      ])
    ).toBe(false);
  });
});

describe('resolveAffectedFtrDomains', () => {
  it('narrows a solution-only diff to that solution', () => {
    expect(
      resolveAffectedFtrDomains([
        'x-pack/solutions/security/plugins/security_solution/public/plugin.tsx',
      ])
    ).toEqual({ outcome: 'narrowed', solutions: ['security'], platformAffected: false });
  });

  it('collects every touched solution', () => {
    expect(
      resolveAffectedFtrDomains([
        'x-pack/solutions/security/plugins/security_solution/public/plugin.tsx',
        'x-pack/solutions/observability/plugins/apm/public/plugin.ts',
      ])
    ).toEqual({
      outcome: 'narrowed',
      solutions: ['observability', 'security'],
      platformAffected: false,
    });
  });

  it('ignores irrelevant files and excluded modules next to a solution change', () => {
    expect(
      resolveAffectedFtrDomains([
        'x-pack/solutions/search/plugins/enterprise_search/public/index.ts',
        'x-pack/solutions/search/plugins/enterprise_search/README.md',
        'src/platform/packages/shared/kbn-scout/src/index.ts',
      ])
    ).toEqual({ outcome: 'narrowed', solutions: ['search'], platformAffected: false });
  });

  it('flags platform and keeps the solutions reached downstream of a platform module', () => {
    const { outcome, solutions, platformAffected } = resolveAffectedFtrDomains([
      'x-pack/solutions/observability/plugins/observability_shared/public/plugin.ts',
    ]);
    expect(outcome).toBe('narrowed');
    expect(platformAffected).toBe(true);
    expect(solutions).toContain('observability');
  });

  it.each([
    ['a critical path', 'pnpm-lock.yaml', 'critical-path'],
    ['a file outside any module', 'some_random_root_script.sh', 'unmapped-module'],
  ])('does not narrow when %s changes', (_, file, outcome) => {
    expect(
      resolveAffectedFtrDomains([
        'x-pack/solutions/security/plugins/security_solution/public/plugin.tsx',
        file,
      ])
    ).toEqual({ outcome, solutions: [], platformAffected: false });
  });

  it('does not narrow when resolution throws', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(affectedPackages, 'getModuleLookup').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(
      resolveAffectedFtrDomains([
        'x-pack/solutions/security/plugins/security_solution/public/plugin.tsx',
      ])
    ).toEqual({ outcome: 'error', solutions: [], platformAffected: false });
    jest.restoreAllMocks();
  });

  it('does not narrow when nothing relevant changed', () => {
    expect(resolveAffectedFtrDomains(['docs/extend/testing.md'])).toEqual({
      outcome: 'no-relevant-modules',
      solutions: [],
      platformAffected: false,
    });
  });
});

describe('isPlatformOwnedFtrConfig', () => {
  it('detects platform-owned configs filed in solution manifests', () => {
    expect(
      isPlatformOwnedFtrConfig(
        'x-pack/platform/test/serverless/functional/configs/security/config.group1.ts'
      )
    ).toBe(true);
  });

  it('rejects solution-owned configs', () => {
    expect(
      isPlatformOwnedFtrConfig(
        'x-pack/solutions/security/plugins/security_solution/public/plugin.tsx'
      )
    ).toBe(false);
  });
});

describe('getFtrRelevantModules + shouldSkipFtrTests', () => {
  const skipFor = async (changedFiles: string[]) => {
    const modules = await getFtrRelevantModules(changedFiles);
    return modules !== null && shouldSkipFtrTests(modules, changedFiles);
  };

  it('ignores plugin Scout trees when resolving modules', async () => {
    const modules = await getFtrRelevantModules([
      'src/platform/packages/shared/kbn-scout/src/playwright/index.ts',
      'src/platform/plugins/shared/console/test/scout/ui/fixtures/page_objects/console_page.ts',
      'x-pack/platform/plugins/private/gen_ai_settings/test/scout/ui/fixtures/page_objects/gen_ai_settings_page.ts',
    ]);
    expect(modules && [...modules]).toEqual(['@kbn/scout']);
  });

  it('skips FTR for a kbn-scout + plugin Scout page objects + docs diff', async () => {
    expect(
      await skipFor([
        '.agents/skills/scout-ui-testing/SKILL.md',
        'docs/extend/testing/page-objects.md',
        'src/platform/packages/shared/kbn-scout/src/playwright/index.ts',
        'src/platform/plugins/shared/console/test/scout/ui/fixtures/page_objects/console_page.ts',
        'x-pack/platform/plugins/private/gen_ai_settings/test/scout/ui/fixtures/page_objects/gen_ai_settings_page.ts',
      ])
    ).toBe(true);
  });

  it('keeps FTR when plugin source changes alongside its Scout tree', async () => {
    expect(
      await skipFor([
        'src/platform/plugins/shared/console/test/scout/ui/fixtures/page_objects/console_page.ts',
        'src/platform/plugins/shared/console/public/plugin.ts',
      ])
    ).toBe(false);
  });
});
