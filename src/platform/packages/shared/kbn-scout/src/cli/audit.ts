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
import type { Command } from '@kbn/dev-cli-runner';
import { findPackageForPath } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';

/**
 * Extracts the `PageObjects` fixture keys straight from `createCorePageObjects`'s
 * returned object literal (`key: createLazyPageObject(...)`), rather than from the
 * `PageObjects` interface: types are erased at runtime, but this shape is stable
 * and has one syntax to parse.
 */
export function extractPageObjectKeys(indexTsSource: string): string[] {
  const returnBlockMatch = indexTsSource.match(
    /function createCorePageObjects[\s\S]*?return \{([\s\S]*?)\n\s*\};/
  );
  if (!returnBlockMatch) return [];

  const keyPattern = /^\s*([a-zA-Z0-9_]+):\s*createLazyPageObject\(/gm;
  const keys: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = keyPattern.exec(returnBlockMatch[1])) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

/**
 * A page object's fixture key is reached two ways in Scout specs/fixtures:
 * property access (`pageObjects.key`) and destructuring
 * (`const { key } = pageObjects` / `{ key }: { pageObjects }`, including other
 * keys alongside it and an optional rename via `key: alias`). Both count as a
 * consumer per the placement policy's "Consumer" definition. Type-only
 * references and forwarded-parameter access are not covered by this pass;
 * see the follow-up note on the audit tracking issue.
 */
export function fileConsumesKey(fileContent: string, key: string): boolean {
  const propertyAccess = new RegExp(`pageObjects\\.${key}\\b`);
  const destructure = new RegExp(`\\{[^{}]*\\b${key}\\b[^{}]*\\}[^=]*=[^=]*[Pp]ageObjects\\b`);
  return propertyAccess.test(fileContent) || destructure.test(fileContent);
}

const SCOUT_TEST_DIR_PATTERN = /(^|\/)test\/scout[^/]*(\/|$)/;
const IGNORED_DIR_NAMES = new Set(['node_modules', 'target']);

/**
 * Recursively lists every `.ts`/`.tsx` file under a `test/scout*` directory
 * anywhere below `rootDir`, skipping `node_modules` and `target`.
 */
export function findScoutTestFiles(rootDir: string): string[] {
  const results: string[] = [];

  function walk(dir: string) {
    let entries: Fs.Dirent[];
    try {
      entries = Fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (IGNORED_DIR_NAMES.has(entry.name)) continue;
      const fullPath = Path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (
        entry.isFile() &&
        (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
        SCOUT_TEST_DIR_PATTERN.test(fullPath.split(Path.sep).join('/'))
      ) {
        results.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return results;
}

export interface PageObjectConsumerCensus {
  key: string;
  fileCount: number;
  modules: string[];
}

/**
 * Fixture-key consumer census: page objects are Proxy-based fixtures
 * (`createLazyPageObject`), not imports, so an import-graph tool (knip, a TS
 * project-references walk) reports every page object as unused. Consumers
 * must instead be found by grepping the fixture key itself and attributing
 * each hit to its owning module.
 */
export function censusPageObjectConsumers(
  repoRoot: string,
  scoutTestFiles: string[],
  pageObjectKeys: string[]
): PageObjectConsumerCensus[] {
  const fileContents = new Map<string, string>();
  const getContent = (file: string) => {
    let content = fileContents.get(file);
    if (content === undefined) {
      content = Fs.readFileSync(file, 'utf8');
      fileContents.set(file, content);
    }
    return content;
  };

  return pageObjectKeys.map((key) => {
    const consumingFiles = scoutTestFiles.filter((file) => fileConsumesKey(getContent(file), key));

    const moduleIds = new Set<string>();
    for (const file of consumingFiles) {
      const pkg = findPackageForPath(repoRoot, file);
      if (pkg) moduleIds.add(pkg.id);
    }

    return {
      key,
      fileCount: consumingFiles.length,
      modules: [...moduleIds].sort(),
    };
  });
}

export function runAudit(repoRoot: string, pageObjectsIndexPath: string) {
  const indexSource = Fs.readFileSync(pageObjectsIndexPath, 'utf8');
  const pageObjectKeys = extractPageObjectKeys(indexSource);
  const scoutTestFiles = findScoutTestFiles(repoRoot);
  return censusPageObjectConsumers(repoRoot, scoutTestFiles, pageObjectKeys);
}

/**
 * `node scripts/scout audit` — reports Scout page object consumer counts.
 *
 * This is the first slice of the kbn-scout quality audit (a fixture-key
 * consumer census for `pageObjects.<key>`). It is deterministic fact-gathering
 * only: it does not judge whether a low or high count means an object should
 * move, merge, or stay. See the audit tracking issue for the planned
 * additions (duplicate class names, `page.components`/`apiServices` census,
 * `--check`/`--report` modes, a baseline file).
 */
export const auditCmd: Command<void> = {
  name: 'audit',
  description: `
  Report Scout page object consumer counts (a fixture-key census).

  Page objects are reached via the 'pageObjects' fixture, not via imports, so
  import-graph tools report every page object as unused. This command instead
  greps each page object's fixture key (property access and destructuring)
  across every 'test/scout*' directory in the repo and attributes each
  consuming file to its owning module.

  This is fact-gathering only. It reports counts; it does not decide whether
  an object should move, merge, or stay — see the kbn-scout placement policy
  (docs/extend/testing/page-objects.md) for that.

  Examples:
    node scripts/scout audit
  `,
  flags: {},
  run: ({ log }) => {
    const pageObjectsIndexPath = Path.resolve(
      REPO_ROOT,
      'src/platform/packages/shared/kbn-scout/src/playwright/page_objects/index.ts'
    );

    const census = runAudit(REPO_ROOT, pageObjectsIndexPath);

    log.info(JSON.stringify(census, null, 2));
  },
};
