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
import ts from 'typescript';

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
 * Same as `extractPageObjectKeys` but fails loudly when nothing matches, so a
 * reshaped `createCorePageObjects` cannot make the audit silently report an
 * empty census with exit code 0.
 */
export function extractPageObjectKeysOrThrow(indexTsSource: string, indexPath: string): string[] {
  const keys = extractPageObjectKeys(indexTsSource);
  if (keys.length === 0) {
    throw new Error(
      `scout audit: found no 'key: createLazyPageObject(...)' entries in ${indexPath}. ` +
        `The regex in extractPageObjectKeys no longer matches createCorePageObjects; update it.`
    );
  }
  return keys;
}

// `pageObjects`, `myPageObjects`, `this.pageObjects`, `fixtures.pageObjects`
const isPageObjectsReference = (node: ts.Node): boolean => {
  if (ts.isIdentifier(node)) return /[Pp]ageObjects$/.test(node.text);
  if (ts.isPropertyAccessExpression(node)) return /[Pp]ageObjects$/.test(node.name.text);
  return false;
};

/**
 * Collects every page object fixture key a file reaches, by walking its AST
 * rather than grepping. Two shapes count as consumption, per the placement
 * policy's "Consumer" definition:
 *
 * - property access: `pageObjects.dashboard` (also `myPageObjects.dashboard`,
 *   `this.pageObjects.dashboard`)
 * - destructuring: `const { dashboard, lens: aliased } = pageObjects`, on one
 *   line or many
 *
 * Comments and string literals are not code, so `'pageObjects.dashboard'` in
 * a string is not a consumer. Type-only references (`PageObjects['dashboard']`)
 * are not counted.
 */
export function collectConsumedKeys(fileContent: string, fileName = 'file.ts'): Set<string> {
  // Parse `.ts` as TS, not TSX: generic arrows like `<T>(v: T) => v` are valid
  // TypeScript but ambiguous in TSX, and a mis-parse would silently drop later
  // `pageObjects` accesses from the census.
  const source = ts.createSourceFile(
    fileName,
    fileContent,
    ts.ScriptTarget.Latest,
    false,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const keys = new Set<string>();

  const visit = (node: ts.Node) => {
    if (ts.isPropertyAccessExpression(node) && isPageObjectsReference(node.expression)) {
      keys.add(node.name.text);
    }

    if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      node.initializer &&
      isPageObjectsReference(node.initializer)
    ) {
      for (const element of node.name.elements) {
        const key = element.propertyName ?? element.name;
        if (ts.isIdentifier(key)) keys.add(key.text);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
  return keys;
}

/** Whether a file reaches the given fixture key. See {@link collectConsumedKeys}. */
export function fileConsumesKey(fileContent: string, key: string): boolean {
  return collectConsumedKeys(fileContent).has(key);
}

// Consumers live in plugin suites (`test/scout*`) and in the solution Scout
// packages (`kbn-scout-<solution>/src/playwright`), whose fixtures and page
// objects call core page objects too. The core package itself
// (`kbn-scout/src/playwright`) is not a consumer of its own keys and is
// deliberately not matched.
const SCOUT_TEST_DIR_PATTERN = /(^|\/)(test\/scout[^/]*|kbn-scout-[^/]+\/src\/playwright)(\/|$)/;
// `__fixtures__` holds this command's own synthetic `test/scout*` tree, which
// would otherwise be walked and counted as real consumers when the audit runs
// on the repo root. `@kbn/repo-packages` skips `__fixtures__` when building the
// package map for the same reason. `.git` is skipped purely to avoid the walk.
const IGNORED_DIR_NAMES = new Set(['node_modules', 'target', '__fixtures__', '.git']);

const CORE_SCOUT_PLAYWRIGHT_DIR = 'src/platform/packages/shared/kbn-scout/src/playwright';

function walkTsFiles(rootDir: string, matches: (posixPath: string) => boolean): string[] {
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
        matches(fullPath.split(Path.sep).join('/'))
      ) {
        results.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return results;
}

/**
 * Recursively lists every `.ts`/`.tsx` file under a `test/scout*` directory or
 * a solution Scout package's `src/playwright` anywhere below `rootDir`,
 * skipping `node_modules`, `target`, `__fixtures__` and `.git`.
 */
export function findScoutTestFiles(rootDir: string): string[] {
  return walkTsFiles(rootDir, (posixPath) => SCOUT_TEST_DIR_PATTERN.test(posixPath));
}

/** Every Scout source file: consumers plus `@kbn/scout`'s own `src/playwright`. */
export function findAllScoutFiles(rootDir: string): string[] {
  const core = walkTsFiles(Path.join(rootDir, CORE_SCOUT_PLAYWRIGHT_DIR), () => true);
  return [...core, ...findScoutTestFiles(rootDir)];
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
  const consumedKeysByFile = new Map<string, Set<string>>();
  for (const file of scoutTestFiles) {
    consumedKeysByFile.set(file, collectConsumedKeys(Fs.readFileSync(file, 'utf8'), file));
  }

  return pageObjectKeys.map((key) => {
    const consumingFiles = scoutTestFiles.filter((file) => consumedKeysByFile.get(file)?.has(key));

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

export interface DuplicateClassName {
  className: string;
  modules: string[];
}

/** Exported class names declared in two or more modules across the given Scout files. */
export function findDuplicateClassNames(repoRoot: string, files: string[]): DuplicateClassName[] {
  const modulesByClass = new Map<string, Set<string>>();

  for (const file of files) {
    const pkg = findPackageForPath(repoRoot, file);
    if (!pkg) continue;
    const source = ts.createSourceFile(
      file,
      Fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      false,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    for (const statement of source.statements) {
      const isExported = ts
        .getModifiers(statement as ts.HasModifiers)
        ?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (ts.isClassDeclaration(statement) && statement.name && isExported) {
        const name = statement.name.text;
        if (!modulesByClass.has(name)) modulesByClass.set(name, new Set());
        modulesByClass.get(name)?.add(pkg.id);
      }
    }
  }

  return [...modulesByClass.entries()]
    .filter(([, modules]) => modules.size > 1)
    .map(([className, modules]) => ({ className, modules: [...modules].sort() }))
    .sort((a, b) => a.className.localeCompare(b.className));
}

export interface AuditReport {
  census: PageObjectConsumerCensus[];
  duplicateClassNames: DuplicateClassName[];
}

export function runAudit(repoRoot: string, pageObjectsIndexPath: string): AuditReport {
  const indexSource = Fs.readFileSync(pageObjectsIndexPath, 'utf8');
  const pageObjectKeys = extractPageObjectKeysOrThrow(indexSource, pageObjectsIndexPath);
  const scoutTestFiles = findScoutTestFiles(repoRoot);
  return {
    census: censusPageObjectConsumers(repoRoot, scoutTestFiles, pageObjectKeys),
    duplicateClassNames: findDuplicateClassNames(repoRoot, findAllScoutFiles(repoRoot)),
  };
}

/**
 * Human readable findings, in Slack mrkdwn. Reports only what needs a look and
 * says why, per the placement policy. Nothing to report prints one line.
 */
export function formatAuditText(report: AuditReport): string {
  const { census, duplicateClassNames } = report;
  const unused = census.filter((c) => c.fileCount === 0);
  const singleFile = census.filter((c) => c.fileCount === 1);
  const singleModule = census.filter((c) => c.fileCount > 1 && c.modules.length === 1);

  const lines: string[] = [`*Scout quality audit* (${census.length} page object keys)`];
  const section = (title: string, items: string[]) => {
    if (items.length === 0) return;
    lines.push('', `*${title}*`, ...items.map((item) => `• ${item}`));
  };

  section(
    'Unused keys, removal candidates',
    unused.map((c) => `\`pageObjects.${c.key}\` has no consumer`)
  );
  section(
    'Single consumer keys',
    singleFile.map((c) => `\`pageObjects.${c.key}\` is used by one file (${c.modules[0]})`)
  );
  section(
    'Keys used by one module only, check they wrap a shared component or belong in that module',
    singleModule.map(
      (c) => `\`pageObjects.${c.key}\` used in ${c.fileCount} files, all in ${c.modules[0]}`
    )
  );
  section(
    'Same class name in more than one module, likely duplicates',
    duplicateClassNames.map((d) => `\`${d.className}\` in ${d.modules.join(', ')}`)
  );

  if (lines.length === 1) lines.push('', 'No findings.');
  lines.push('', 'Placement rules: docs/extend/testing/page-objects.md');
  return lines.join('\n');
}

/**
 * `node scripts/scout audit` — reports Scout page object consumer counts.
 *
 * This is the first slice of the kbn-scout quality audit (a fixture-key
 * consumer census for `pageObjects.<key>`). It is deterministic fact-gathering
 * only: it does not judge whether a low or high count means an object should
 * move, merge, or stay.
 *
 * Meant to be run by hand on a cadence, not in CI, so there is no check mode
 * and no baseline file: it reports and exits 0.
 */
export const auditCmd: Command<void> = {
  name: 'audit',
  description: `
  Report Scout page object consumer counts and duplicate class names.

  Page objects are reached via the 'pageObjects' fixture, not via imports, so
  import-graph tools report every page object as unused. This command instead
  parses every '.ts' file under 'test/scout*' directories and the solution
  Scout packages' 'src/playwright', collects the fixture keys each file reaches
  (property access and destructuring), and attributes each consuming file to
  its owning module.

  This is fact-gathering only. It reports counts; it does not decide whether
  an object should move, merge, or stay — see the kbn-scout placement policy
  (docs/extend/testing/page-objects.md) for that.

  Examples:
    node scripts/scout audit
    node scripts/scout audit --format text
  `,
  flags: {
    string: ['format'],
    default: { format: 'json' },
    help: `
    --format  'json' (default, for tooling) or 'text' (findings only, for people and Slack)
    `,
  },
  run: ({ log, flags }) => {
    const pageObjectsIndexPath = Path.resolve(
      REPO_ROOT,
      'src/platform/packages/shared/kbn-scout/src/playwright/page_objects/index.ts'
    );

    const report = runAudit(REPO_ROOT, pageObjectsIndexPath);

    // `write` rather than `info`: the report is meant to be piped, and `info`
    // prefixes the first line with ' info '.
    log.write(flags.format === 'text' ? formatAuditText(report) : JSON.stringify(report, null, 2));
  },
};
