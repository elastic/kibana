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
import { getKibanaDir } from '../../utils';
import { getModuleLookup } from '../../affected-packages/module_lookup';
import { FTR_EXCLUDED_MODULES, shouldSkipFtrTests } from './selective_ftr';

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
        'yarn.lock',
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
});
