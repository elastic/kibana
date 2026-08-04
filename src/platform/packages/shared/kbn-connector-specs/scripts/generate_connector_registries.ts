/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Derives `all_specs.ts`, `connector_icons_map.ts`, and the per-connector ownership block in
 * `.github/CODEOWNERS` from the connector specs found under `src/specs/`, so none of them ever
 * need to be hand-edited.
 *
 * Every connector PR used to append a line to each of these, near the same location (the end of
 * the list). With many connector PRs landing concurrently, that made them frequent merge-conflict
 * hotspots: at least twice a TS-file conflict was resolved incorrectly by hand, leaving an
 * unbalanced `lazy(...)` call that broke the build (caught by a reviewer, not CI), and the
 * CODEOWNERS append logic itself drifted over several PRs into misplaced/misordered entries
 * (also only caught by manual review, per the `review-connector` skill's checklist).
 *
 * Making these generated turns "manually re-thread nested parens during a conflict resolution"
 * or "hand-splice a CODEOWNERS line in the right alphabetical spot" into "re-run the generator"
 * (`node scripts/generate connector-registries`, in `@kbn/generate`, or automatically as part of
 * `node scripts/generate connector`), and a test (`generate_connector_registries.test.ts`) fails
 * CI if any of the three drifts from what the generator would produce, so a bad manual edit can
 * never reach a reviewer silently.
 *
 * This module also exports `validateConnectorDocsList`, a structural (not full-regeneration)
 * check for the fourth hotspot file, `data-context-sources-connectors-list.md`. Unlike the three
 * files above, its descriptions are hand-written prose, so it can't be fully derived from
 * `src/specs/` — but ordering and duplicate-link mistakes (both found, in the wild, in that file:
 * an out-of-order "Firecrawl"/"Figma" pair, and "Gmail" linked twice under two different display
 * names) are still mechanically detectable, so `generate_connector_registries.test.ts` fails CI
 * on those without needing to regenerate the file's content.
 *
 * This module has no `.js`/CLI wrapper of its own: it's Node-only tooling (imports `fs`, `eslint`,
 * `prettier`), so it can't live in this package's isomorphic `src/`, but it's also small and
 * single-purpose enough that it doesn't need its own CLI — it's consumed as a library, via the
 * `@kbn/connector-specs/codegen` entry point, by `@kbn/generate`'s `connector` and
 * `connector-registries` commands.
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { basename, dirname, join, relative, sep } from 'path';
import prettier from 'prettier';
import { ESLint, type Linter } from 'eslint';
import { REPO_ROOT } from '@kbn/repo-info';

export interface ConnectorRegistryEntry {
  /** The connector's `metadata.id`, e.g. `.abuseipdb`. */
  id: string;
  /**
   * The identifier the connector's `ConnectorSpec` is exported under, e.g. `Slack` from
   * `export const Slack: ConnectorSpec = {...}`. Used to re-export it by name from `all_specs.ts`
   * instead of a blanket `export *`, so that other same-named top-level exports in the same file
   * (like `OWNER`) don't collide across connectors sharing the barrel.
   */
  exportName: string;
  /** Import path (without extension) for `all_specs.ts`, e.g. `./specs/abuseipdb/abuseipdb`. */
  specImportPath: string;
  /** Import path for `connector_icons_map.ts`, or `null` if the connector has no icon yet. */
  iconImportPath: string | null;
  /**
   * The connector's `export const OWNER` (a GitHub team handle, e.g. `@elastic/workchat-eng`),
   * used to keep `.github/CODEOWNERS` in sync.
   */
  owner: string;
  /**
   * The top-level directory name directly under `src/specs/`, e.g. `atlassian` for a connector
   * defined at `src/specs/atlassian/jira-cloud/jira.ts`. CODEOWNERS assigns ownership per
   * top-level directory, not per connector, so multiple connectors can share one.
   */
  specDirName: string;
}

const PACKAGE_ROOT = join(__dirname, '..');
const SRC_DIR = join(PACKAGE_ROOT, 'src');
const SPECS_DIR = join(SRC_DIR, 'specs');

export const ALL_SPECS_PATH = join(SRC_DIR, 'all_specs.ts');
export const ICONS_MAP_PATH = join(SRC_DIR, 'connector_icons_map.ts');
export const CODEOWNERS_PATH = join(REPO_ROOT, '.github/CODEOWNERS');
export const CONNECTOR_DOCS_LIST_PATH = join(
  REPO_ROOT,
  'docs/reference/connectors-kibana/_snippets/data-context-sources-connectors-list.md'
);
export const DOCS_TOC_PATH = join(REPO_ROOT, 'docs/reference/toc.yml');
/** The TOC entry whose `children:` list every scaffolded third-party connector doc joins. */
export const DOCS_TOC_CONNECTORS_SECTION = 'connectors-kibana/data-context-sources-connectors.md';

export const REGENERATE_COMMAND = 'node scripts/generate connector-registries';

export const CONNECTOR_OWNERS_MARKER_START = `# BEGIN GENERATED CONNECTOR OWNERS -- run \`${REGENERATE_COMMAND}\` to update, do not edit by hand`;
export const CONNECTOR_OWNERS_MARKER_END = '# END GENERATED CONNECTOR OWNERS';

/**
 * Resolves the license header text a file must start with from `.eslintrc.js`'s
 * `@kbn/eslint/require-license-header` rule config — the single place that text is defined —
 * instead of hard-coding a copy of it here that could drift from the real one.
 *
 * Not safe to call from inside Jest: ESLint's config loader does its own `require()`s of
 * `.eslintrc.js` and its plugins, which conflicts with Jest's module registry. That's why
 * `generate_connector_registries.test.ts` reads the header already present in the generated files
 * instead of calling this — the repo-wide `@kbn/eslint/require-license-header` lint rule (run in
 * CI independently of that test) is what actually keeps that header correct.
 */
async function resolveLicenseHeader(filepath: string): Promise<string> {
  const eslint = new ESLint({ cwd: REPO_ROOT });
  const config = (await eslint.calculateConfigForFile(filepath)) as Linter.Config;
  const ruleConfig = config.rules?.['@kbn/eslint/require-license-header'];
  const options = Array.isArray(ruleConfig) ? ruleConfig[1] : undefined;
  const license =
    options && typeof options === 'object' && 'license' in options ? options.license : undefined;

  if (typeof license !== 'string') {
    throw new Error(
      `Could not resolve a "@kbn/eslint/require-license-header" license for ` +
        `"${relative(REPO_ROOT, filepath)}" from .eslintrc.js.`
    );
  }
  return license.trim();
}

// Directories that never contain a connector spec definition file themselves.
const EXCLUDED_DIR_NAMES = new Set(['icon', '__snapshots__']);

function generatedFileNotice(purpose: string): string {
  return [
    '/**',
    ' * GENERATED FILE - DO NOT EDIT BY HAND.',
    ' *',
    ` * ${purpose}`,
    ' * It is derived by scanning `src/specs/` for connector spec definitions.',
    ' *',
    ' * To add, remove, or rename a connector, change its source under `src/specs/` and run:',
    ` *   ${REGENERATE_COMMAND}`,
    ' *',
    ' * A test in `generate_connector_registries.test.ts` fails CI if this file drifts from what',
    ' * the generator would produce, so it can never go stale or be hand-edited into an',
    ' * inconsistent state (e.g. an unbalanced paren from a manually-resolved merge conflict).',
    ' */',
  ].join('\n');
}

function collectCandidateSpecFiles(dir: string, results: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      if (EXCLUDED_DIR_NAMES.has(entry)) continue;
      collectCandidateSpecFiles(fullPath, results);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts') && entry !== 'types.ts') {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Extracts a connector's `metadata.id`. Handles both an inline string literal
 * (`id: '.abuseipdb'`) and a reference to a local constant (`id: JINA_READER_CONNECTOR_ID`,
 * with `const JINA_READER_CONNECTOR_ID = '.jina';` declared elsewhere in the same file).
 * Returns `null` for files that aren't a top-level ConnectorSpec definition (helpers, mocks).
 */
export function extractConnectorId(content: string): string | null {
  const metadataMatch = content.match(/metadata:\s*\{[^}]*?id:\s*([^,\n]+),/);
  if (!metadataMatch) return null;

  const rawIdExpression = metadataMatch[1].trim();

  const literalMatch = rawIdExpression.match(/^['"](.+)['"]$/);
  if (literalMatch) return literalMatch[1];

  if (/^[A-Za-z_$][\w$]*$/.test(rawIdExpression)) {
    const constMatch = content.match(
      new RegExp(`const\\s+${rawIdExpression}\\s*(?::[^=]+)?=\\s*['"]([^'"]+)['"]`)
    );
    if (constMatch) return constMatch[1];
  }

  return null;
}

/**
 * Extracts the identifier a connector's `ConnectorSpec` is exported under, e.g. `Slack` from
 * `export const Slack: ConnectorSpec = {...}`. Returns `null` for files with no such export
 * (helpers, mocks).
 */
export function extractConnectorExportName(content: string): string | null {
  const match = content.match(/export const (\w+): ConnectorSpec = \{/);
  return match ? match[1] : null;
}

const OWNER_PATTERN = /^@elastic\/[a-z0-9-]+$/;

/**
 * Extracts a connector's `export const OWNER = '@elastic/team';` declaration. Returns `null` if
 * the file has no such declaration at all (helpers, mocks, or a spec file missing it).
 */
export function extractConnectorOwner(content: string): string | null {
  const match = content.match(/export const OWNER\s*=\s*(['"])(.*?)\1/);
  return match ? match[2] : null;
}

function toImportPath(absPathWithoutExt: string): string {
  const relPath = relative(SRC_DIR, absPathWithoutExt).split(sep).join('/');
  return relPath.startsWith('.') ? relPath : `./${relPath}`;
}

/**
 * Finds the icon component to import for a connector, given the directory its spec file lives
 * in. Every connector but one follows the `icon/index.tsx` convention; the exception (`jina`)
 * has a single differently-named file directly inside `icon/`, so we fall back to that when
 * there's no `index.tsx`/`index.ts`.
 */
export function findIconImportPath(specFileDir: string): string | null {
  const iconDir = join(specFileDir, 'icon');
  if (!existsSync(iconDir) || !statSync(iconDir).isDirectory()) {
    return null;
  }

  const componentFiles = readdirSync(iconDir).filter((f) => /\.tsx?$/.test(f));
  if (componentFiles.some((f) => f === 'index.tsx' || f === 'index.ts')) {
    return toImportPath(iconDir);
  }
  if (componentFiles.length === 1) {
    return toImportPath(join(iconDir, basename(componentFiles[0]).replace(/\.tsx?$/, '')));
  }
  return null;
}

/**
 * Derives a canonical, deterministic webpack chunk name from a connector id, e.g.
 * `.aws_x_ray` -> `connectorIconAwsXRay`. This intentionally doesn't try to preserve the
 * ad-hoc (and inconsistently-cased) chunk names that were previously hand-written.
 */
export function toChunkName(connectorId: string): string {
  const pascalCase = connectorId
    .replace(/^\./, '')
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return `connectorIcon${pascalCase}`;
}

/**
 * Scans `src/specs/` and returns one entry per connector, sorted by id. Throws if two spec
 * files declare the same `metadata.id`.
 */
export function computeConnectorRegistry(): ConnectorRegistryEntry[] {
  const idToFile = new Map<string, string>();
  const entries: ConnectorRegistryEntry[] = [];

  for (const file of collectCandidateSpecFiles(SPECS_DIR)) {
    const content = readFileSync(file, 'utf8');
    const id = extractConnectorId(content);
    if (!id) continue;

    const existingFile = idToFile.get(id);
    if (existingFile) {
      throw new Error(
        `Duplicate connector id "${id}" found in both "${relative(PACKAGE_ROOT, existingFile)}" ` +
          `and "${relative(
            PACKAGE_ROOT,
            file
          )}". Every connector spec must have a unique metadata.id.`
      );
    }
    idToFile.set(id, file);

    const owner = extractConnectorOwner(content);
    if (!owner) {
      throw new Error(
        `Connector spec "${relative(PACKAGE_ROOT, file)}" (id "${id}") is missing an ` +
          `"export const OWNER = '@elastic/team';" declaration, needed to keep ` +
          `.github/CODEOWNERS in sync.`
      );
    }
    if (!OWNER_PATTERN.test(owner)) {
      throw new Error(
        `Connector spec "${relative(
          PACKAGE_ROOT,
          file
        )}" has an invalid OWNER "${owner}" (expected something like "@elastic/team-name").`
      );
    }

    const exportName = extractConnectorExportName(content);
    if (!exportName) {
      throw new Error(
        `Could not find "export const <Name>: ConnectorSpec = {" in "${relative(
          PACKAGE_ROOT,
          file
        )}" (id "${id}").`
      );
    }

    entries.push({
      id,
      exportName,
      specImportPath: toImportPath(file.replace(/\.ts$/, '')),
      iconImportPath: findIconImportPath(dirname(file)),
      owner,
      specDirName: relative(SPECS_DIR, file).split(sep)[0],
    });
  }

  return entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function formatWithPrettier(source: string, filepath: string): string {
  const config = prettier.resolveConfig.sync(filepath) ?? {};
  return prettier.format(source, { ...config, filepath });
}

export function renderAllSpecsFile(
  entries: ConnectorRegistryEntry[],
  licenseHeader: string
): string {
  // Named re-exports (not a blanket `export *`): every spec file also exports an `OWNER` constant
  // (see `extractConnectorOwner`), and `export *` from many modules sharing an export name of the
  // same name causes a hard "Cannot redefine property" crash at module-load time, since two
  // re-exports of a same-named binding can't both be spliced into this barrel's own export object.
  const exportLines = entries
    .map((e) => `export { ${e.exportName} } from '${e.specImportPath}';`)
    .join('\n');
  const source = [
    licenseHeader,
    '',
    generatedFileNotice('Barrel file re-exporting every connector spec.'),
    '',
    exportLines,
    '',
  ].join('\n');
  return formatWithPrettier(source, ALL_SPECS_PATH);
}

export function renderConnectorIconsMapFile(
  entries: ConnectorRegistryEntry[],
  licenseHeader: string
): string {
  const mapEntries = entries
    .filter(
      (e): e is ConnectorRegistryEntry & { iconImportPath: string } => e.iconImportPath !== null
    )
    .map((e) => {
      const chunkName = toChunkName(e.id);
      return `['${e.id}', lazy(() => import(/* webpackChunkName: "${chunkName}" */ '${e.iconImportPath}'))],`;
    })
    .join('\n');

  const source = [
    licenseHeader,
    '',
    "import { lazy } from 'react';",
    "import type { ConnectorIconProps } from './types';",
    '',
    generatedFileNotice('Maps each connector id to its lazily-loaded icon component.'),
    '',
    'export const ConnectorIconsMap: Map<',
    '  string,',
    '  React.LazyExoticComponent<React.ComponentType<ConnectorIconProps>>',
    '> = new Map([',
    mapEntries,
    ']);',
    '',
  ].join('\n');
  return formatWithPrettier(source, ICONS_MAP_PATH);
}

/**
 * Groups entries by their top-level `src/specs/` directory (several connectors can share one,
 * e.g. `atlassian/confluence-cloud` and `atlassian/jira-cloud`), since CODEOWNERS assigns
 * ownership per directory. Throws if connectors sharing a directory disagree on OWNER, since
 * CODEOWNERS can't express two owners for the same path with a single rule.
 */
function groupEntriesByCodeownersDir(
  entries: ConnectorRegistryEntry[]
): Array<{ specDirName: string; owner: string }> {
  const ownerBySpecDir = new Map<string, string>();

  for (const entry of entries) {
    const existingOwner = ownerBySpecDir.get(entry.specDirName);
    if (existingOwner && existingOwner !== entry.owner) {
      throw new Error(
        `Connectors under "src/specs/${entry.specDirName}/" have inconsistent OWNER values ` +
          `("${existingOwner}" vs "${entry.owner}"). All connectors sharing a top-level spec ` +
          `directory must declare the same OWNER, since CODEOWNERS assigns ownership per directory.`
      );
    }
    ownerBySpecDir.set(entry.specDirName, entry.owner);
  }

  return [...ownerBySpecDir.entries()]
    .map(([specDirName, owner]) => ({ specDirName, owner }))
    .sort((a, b) => (a.specDirName < b.specDirName ? -1 : a.specDirName > b.specDirName ? 1 : 0));
}

/**
 * Renders the generated block of per-connector CODEOWNERS lines (without the surrounding
 * markers), one line per top-level `src/specs/` directory, sorted alphabetically to match how
 * the file paths read.
 */
export function renderConnectorOwnersCodeownersLines(entries: ConnectorRegistryEntry[]): string {
  return groupEntriesByCodeownersDir(entries)
    .map(
      ({ specDirName, owner }) =>
        `src/platform/packages/shared/kbn-connector-specs/src/specs/${specDirName}/** ${owner}`
    )
    .join('\n');
}

/**
 * Replaces the content between the `CONNECTOR_OWNERS_MARKER_START`/`_END` markers in an existing
 * `.github/CODEOWNERS` file with a freshly-rendered block, leaving everything else in the file
 * untouched. Throws if the markers are missing or out of order, rather than silently doing
 * nothing — this is the same failure mode as a manually-deleted marker in any other generated
 * file.
 */
export function computeUpdatedCodeowners(
  currentContent: string,
  entries: ConnectorRegistryEntry[]
): string {
  const startIdx = currentContent.indexOf(CONNECTOR_OWNERS_MARKER_START);
  const endIdx = currentContent.indexOf(CONNECTOR_OWNERS_MARKER_END);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error(
      `Could not find both the "${CONNECTOR_OWNERS_MARKER_START}" and ` +
        `"${CONNECTOR_OWNERS_MARKER_END}" markers in "${relative(
          REPO_ROOT,
          CODEOWNERS_PATH
        )}". They delimit the generated per-connector ownership block and must both be present.`
    );
  }
  if (endIdx < startIdx) {
    throw new Error(
      `The "${CONNECTOR_OWNERS_MARKER_END}" marker appears before ` +
        `"${CONNECTOR_OWNERS_MARKER_START}" in "${relative(REPO_ROOT, CODEOWNERS_PATH)}".`
    );
  }

  const before = currentContent.slice(0, startIdx);
  const after = currentContent.slice(endIdx + CONNECTOR_OWNERS_MARKER_END.length);
  const newSection = [
    CONNECTOR_OWNERS_MARKER_START,
    renderConnectorOwnersCodeownersLines(entries),
    CONNECTOR_OWNERS_MARKER_END,
  ].join('\n');
  return `${before}${newSection}${after}`;
}

const DOCS_LIST_CATEGORY_HEADER = /^\*\*(.+)\*\*$/;
const DOCS_LIST_ITEM = /^-\s*\[([^\]]+)\]\(([^)]+)\)/;

/**
 * Checks `data-context-sources-connectors-list.md` for the two failure modes a manually-resolved
 * merge conflict (or a bad hand-edit) tends to introduce there: an entry landing out of
 * alphabetical order within its `**Category**` block, or the same connector doc getting linked
 * twice under different display names (e.g. once as "Gmail" and again as "Google Gmail"). Returns
 * a list of human-readable problem descriptions; an empty array means the file is clean.
 *
 * This file's descriptions are hand-written prose, so — unlike `all_specs.ts`,
 * `connector_icons_map.ts`, and CODEOWNERS — it can't be fully regenerated from `src/specs/`.
 * This only validates structure, not content.
 */
export function validateConnectorDocsList(content: string): string[] {
  const problems: string[] = [];
  const seenHrefs = new Map<string, string>();
  let currentCategory = '(start of file)';
  let previousDisplayName: string | null = null;

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();

    const headerMatch = line.match(DOCS_LIST_CATEGORY_HEADER);
    if (headerMatch) {
      currentCategory = headerMatch[1];
      previousDisplayName = null;
      continue;
    }

    const itemMatch = line.match(DOCS_LIST_ITEM);
    if (!itemMatch) continue;
    const [, displayName, href] = itemMatch;

    const existingDisplayName = seenHrefs.get(href);
    if (existingDisplayName) {
      problems.push(
        `"${href}" is linked twice, as "${existingDisplayName}" and as "${displayName}". Remove ` +
          `the duplicate entry.`
      );
    } else {
      seenHrefs.set(href, displayName);
    }

    if (
      previousDisplayName !== null &&
      displayName.toLowerCase() < previousDisplayName.toLowerCase()
    ) {
      problems.push(
        `"${displayName}" is out of alphabetical order in the "${currentCategory}" category ` +
          `(it comes after "${previousDisplayName}").`
      );
    }
    previousDisplayName = displayName;
  }

  return problems;
}

/**
 * Checks the third-party connectors section of `docs/reference/toc.yml` for the same two
 * hand-merge failure modes `validateConnectorDocsList` catches in the snippet list: a child
 * `- file:` entry landing out of alphabetical order (both `posthog`/`prometheus-alertmanager`
 * and a Buildkite TOC placement had to be fixed by reviewers), or the same doc listed twice
 * (a mis-resolved reorder once left `gmail-action-type.md` in twice). Returns human-readable
 * problem descriptions; an empty array means the section is clean.
 *
 * Like the snippet list, `toc.yml` mixes generated-adjacent entries with hand-maintained ones
 * elsewhere in the file, so only the `data-context-sources-connectors.md` children block —
 * the one every scaffolded connector inserts into — is validated, structurally.
 */
export function validateConnectorToc(content: string): string[] {
  const problems: string[] = [];
  const lines = content.split('\n');
  const sectionIdx = lines.findIndex((l) => l.includes(`file: ${DOCS_TOC_CONNECTORS_SECTION}`));

  if (sectionIdx === -1) {
    return [
      `Could not find the "file: ${DOCS_TOC_CONNECTORS_SECTION}" section. If the section moved, ` +
        `update DOCS_TOC_CONNECTORS_SECTION in generate_connector_registries.ts.`,
    ];
  }

  let childIndent: string | null = null;
  let previousFile: string | null = null;
  const seenFiles = new Set<string>();

  for (let i = sectionIdx + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '' || trimmed === 'children:') continue;

    const currentIndent = lines[i].match(/^(\s*)/)?.[1] ?? '';
    if (childIndent === null && trimmed.startsWith('- file:')) {
      childIndent = currentIndent;
    }
    if (childIndent === null) continue;
    // Outdenting past the children indentation means the section ended.
    if (currentIndent.length < childIndent.length) break;
    if (currentIndent !== childIndent || !trimmed.startsWith('- file:')) continue;

    const file = trimmed.replace(/^- file:\s*/, '');

    if (seenFiles.has(file)) {
      problems.push(`"${file}" is listed twice in the connectors TOC section. Remove the duplicate.`);
    }
    seenFiles.add(file);

    if (previousFile !== null && file.toLowerCase() < previousFile.toLowerCase()) {
      problems.push(
        `"${file}" is out of alphabetical order in the connectors TOC section ` +
          `(it comes after "${previousFile}").`
      );
    }
    previousFile = file;
  }

  return problems;
}

export interface GeneratedConnectorFile {
  path: string;
  content: string;
}

/**
 * Computes the up-to-date contents of all three generated artifacts, without writing anything.
 * Used by `@kbn/generate`'s `connector-registries` command to implement `--check`.
 */
export async function computeGeneratedFiles(): Promise<{
  entries: ConnectorRegistryEntry[];
  files: GeneratedConnectorFile[];
}> {
  const entries = computeConnectorRegistry();
  const [allSpecsLicense, iconsMapLicense] = await Promise.all([
    resolveLicenseHeader(ALL_SPECS_PATH),
    resolveLicenseHeader(ICONS_MAP_PATH),
  ]);
  const currentCodeowners = readFileSync(CODEOWNERS_PATH, 'utf8');
  return {
    entries,
    files: [
      { path: ALL_SPECS_PATH, content: renderAllSpecsFile(entries, allSpecsLicense) },
      { path: ICONS_MAP_PATH, content: renderConnectorIconsMapFile(entries, iconsMapLicense) },
      { path: CODEOWNERS_PATH, content: computeUpdatedCodeowners(currentCodeowners, entries) },
    ],
  };
}

/**
 * Regenerates `all_specs.ts`, `connector_icons_map.ts`, and the per-connector ownership block in
 * `.github/CODEOWNERS` in place. Called directly (in-process) by `@kbn/generate`'s `connector`
 * command after scaffolding a new connector, and by its `connector-registries` command for
 * standalone regeneration (e.g. to resolve a merge conflict).
 */
export async function writeConnectorRegistries(): Promise<ConnectorRegistryEntry[]> {
  const { entries, files } = await computeGeneratedFiles();
  for (const { path, content } of files) {
    writeFileSync(path, content);
  }
  return entries;
}
