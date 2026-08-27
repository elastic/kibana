/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';
import Path from 'path';

import { REPO_ROOT } from '../../lib/paths.mjs';

const WORKSPACE_PATH = Path.resolve(REPO_ROOT, 'pnpm-workspace.yaml');

// We own the packages: block (derived from kibana.jsonc discovery) and the
// fenced overrides block (derived from package.json#resolutions). The rest of
// pnpm-workspace.yaml — install settings, allowBuilds, pnpm-only override pins —
// is authored by hand and left untouched. Keep these markers in sync with
// render_pnpm_workspace.ts.
const PACKAGES_START = '# START GENERATED PACKAGES';
const PACKAGES_END = '# END GENERATED PACKAGES';
const OVERRIDES_START = '# START GENERATED OVERRIDES';
const OVERRIDES_END = '# END GENERATED OVERRIDES';

// Resolutions intentionally not generated as broad selectors, each mapped to the
// authored override that covers it (value sync is verified below).
// `@elastic/elasticsearch/@elastic/transport` as `@elastic/elasticsearch>@elastic/transport`
// would also match the `elasticsearch-8.x` npm: alias (pnpm matches real package
// names) and force a v9 transport under the v8 client.
const AUTHORED_EQUIVALENTS = new Map([
  ['@elastic/elasticsearch/@elastic/transport', '@elastic/elasticsearch@9>@elastic/transport'],
]);

/**
 * Writes pnpm-workspace.yaml and synthesizes a minimal package.json for any
 * package that doesn't ship one. Kibana packages are identified by kibana.jsonc,
 * but pnpm workspaces need a package.json with a matching `name` per package, so
 * we generate the missing ones (gitignored) from the manifest id + root version.
 *
 * @param {import('@kbn/repo-packages').Package[]} pkgs
 * @param {string} rootVersion
 * @param {import('src/platform/packages/private/kbn-some-dev-log').SomeDevLog} log
 */
export async function regeneratePnpmWorkspace(pkgs, rootVersion, log) {
  await writeWorkspaceFile(pkgs, await readResolutions(), log);
  await synthesizeMissingPackageJsons(pkgs, rootVersion, log);
}

async function writeWorkspaceFile(pkgs, resolutions, log) {
  const dirs = pkgs.map((p) => p.normalizedRepoRelativeDir).sort();
  const packagesBlock = [
    PACKAGES_START,
    'packages:',
    ...dirs.map((d) => `  - '${d}'`),
    PACKAGES_END,
  ].join('\n');

  const current = await readIfExists(WORKSPACE_PATH);
  const packagesRe = new RegExp(`${PACKAGES_START}[\\s\\S]*?${PACKAGES_END}`);
  if (current === undefined || !packagesRe.test(current)) {
    throw new Error(
      `pnpm-workspace.yaml must exist with the "${PACKAGES_START} … ${PACKAGES_END}" markers`
    );
  }

  const next = renderOverrides(current.replace(packagesRe, packagesBlock), resolutions);
  if (current !== next) {
    await Fsp.writeFile(WORKSPACE_PATH, next);
    log.warning('updated pnpm-workspace.yaml');
  }
}

async function readResolutions() {
  const pkg = JSON.parse(await Fsp.readFile(Path.resolve(REPO_ROOT, 'package.json'), 'utf8'));
  return pkg.resolutions ?? {};
}

/** Rewrites the fenced overrides block from resolutions; validates authored pins around it. */
function renderOverrides(content, resolutions) {
  const overridesRe = new RegExp(`  ${OVERRIDES_START}[\\s\\S]*?  ${OVERRIDES_END}`);
  if (!overridesRe.test(content)) {
    throw new Error(
      `pnpm-workspace.yaml must exist with the "${OVERRIDES_START} … ${OVERRIDES_END}" markers inside overrides:`
    );
  }

  const generated = new Map();
  for (const [key, value] of Object.entries(resolutions)) {
    if (!AUTHORED_EQUIVALENTS.has(key)) {
      generated.set(yarnKeyToPnpmSelector(key), value);
    }
  }

  const authored = parseAuthoredOverrides(content, overridesRe);
  for (const key of generated.keys()) {
    if (authored.has(key)) {
      throw new Error(
        `overrides["${key}"] is both generated from resolutions and authored — remove the authored entry`
      );
    }
  }
  for (const [resKey, authoredSelector] of AUTHORED_EQUIVALENTS) {
    const want = resolutions[resKey];
    if (want === undefined) continue;
    const got = authored.get(authoredSelector);
    if (got === undefined) {
      throw new Error(
        `resolutions["${resKey}"] needs the authored override "${authoredSelector}" in pnpm-workspace.yaml (a broad selector would hit the elasticsearch-8.x alias)`
      );
    }
    if (got !== want) {
      throw new Error(
        `overrides["${authoredSelector}"] (${got}) is out of sync with resolutions["${resKey}"] (${want})`
      );
    }
  }

  const lines = [...generated]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, value]) => `  '${key}': '${value.replace(/'/g, "''")}'`);
  return content.replace(
    overridesRe,
    [`  ${OVERRIDES_START}`, ...lines, `  ${OVERRIDES_END}`].join('\n')
  );
}

/** Maps yarn resolution keys to pnpm selectors: `**\/a` -> `a`, `a/b` -> `a>b`. */
function yarnKeyToPnpmSelector(key) {
  const names = [];
  for (const part of key.split('/')) {
    if (!part || part === '**') continue;
    const prev = names[names.length - 1];
    if (prev && prev.startsWith('@') && !prev.includes('/')) {
      names[names.length - 1] = `${prev}/${part}`;
    } else {
      names.push(part);
    }
  }
  if (names.length === 0 || names.length > 2) {
    throw new Error(
      `cannot map resolutions key "${key}" to a pnpm override selector (at most one ">" is supported)`
    );
  }
  return names.join('>');
}

/** Reads the overrides map entries outside the generated fence. */
function parseAuthoredOverrides(content, overridesRe) {
  const entries = new Map();
  const withoutGenerated = content.replace(overridesRe, '');
  const section = withoutGenerated.match(/^overrides:\n((?:[ \t].*\n|\n)*)/m);
  for (const line of section ? section[1].split('\n') : []) {
    if (line.trimStart().startsWith('#')) continue;
    const m = line.match(/^ {2}(?:'([^']+)'|([^':]+)): +'?(.*?)'? *$/);
    if (m) entries.set(m[1] ?? m[2].trim(), m[3]);
  }
  return entries;
}

/** @returns {Promise<string[]>} repo-relative paths of packages we generated a package.json for */
async function synthesizeMissingPackageJsons(pkgs, rootVersion, log) {
  const generatedRepoRels = [];
  let written = 0;
  await Promise.all(
    pkgs.map(async (p) => {
      // A package "ships" its own package.json only if it's a real, source-controlled one.
      // Files we previously generated carry a sentinel and must be (re)managed by us.
      if (p.pkg && !isGeneratedManifest(p.pkg)) return;
      generatedRepoRels.push(p.normalizedRepoRelativeDir);
      const path = Path.resolve(p.directory, 'package.json');
      const contents = generatedPackageJson(p.id, rootVersion);
      if ((await readIfExists(path)) !== contents) {
        await Fsp.writeFile(path, contents);
        written += 1;
      }
    })
  );
  if (written) {
    log.warning(`generated ${written} package.json file(s) for workspace packages`);
  }
  return generatedRepoRels.sort();
}

function isGeneratedManifest(pkg) {
  return !!pkg && pkg.kbnGenerated === true;
}

function generatedPackageJson(id, version) {
  return `${JSON.stringify(
    {
      name: id,
      version,
      private: true,
      license: 'Elastic-2.0',
      kbnGenerated: true,
    },
    null,
    2
  )}\n`;
}

async function readIfExists(path) {
  try {
    return await Fsp.readFile(path, 'utf8');
  } catch {
    return undefined;
  }
}
