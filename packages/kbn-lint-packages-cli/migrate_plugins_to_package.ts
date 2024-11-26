/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Fsp from 'fs/promises';
import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { asyncMapWithLimit } from '@kbn/std';
import { RepoPath } from '@kbn/repo-path';
import { type PluginPackageManifest } from '@kbn/repo-packages';

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function convertPluginIdToPackageId(pluginId: string) {
  if (pluginId === 'core') {
    // core is the only non-plugin
    return `@kbn/core`;
  }

  return `@kbn/${pluginId
    .split('')
    .flatMap((c) => (c.toUpperCase() === c ? `-${c.toLowerCase()}` : c))
    .join('')}-plugin`
    .replace(/-\w(-\w)+-/g, (match) => `-${match.split('-').join('')}-`)
    .replace(/-plugin-plugin$/, '-plugin');
}

function normalizeDir(dir: string): string {
  if (dir.startsWith('./')) {
    return normalizeDir(dir.slice(2));
  }

  if (dir !== '/' && dir.endsWith('/')) {
    return normalizeDir(dir.slice(0, -1));
  }

  if (!dir.startsWith('/')) {
    return normalizeDir(`/${dir}`);
  }

  return dir;
}

function getPluginManifest(dir: string, legacy: any, owners: string[]): PluginPackageManifest {
  return {
    type: 'plugin',
    id: convertPluginIdToPackageId(legacy.id),
    owner: owners,
    description: legacy.description || undefined,
    serviceFolders: legacy.serviceFolders,
    plugin: {
      id: legacy.id,
      type: legacy.type,
      server: legacy.server ?? Fs.existsSync(Path.resolve(dir, 'server')),
      browser: legacy.ui ?? Fs.existsSync(Path.resolve(dir, 'public')),
      configPath: legacy.configPath,
      enabledOnAnonymousPages: legacy.enabledOnAnonymousPages,
      requiredPlugins: legacy.requiredPlugins?.length ? legacy.requiredPlugins : undefined,
      optionalPlugins: legacy.optionalPlugins?.length ? legacy.optionalPlugins : undefined,
      requiredBundles: legacy.requiredBundles?.length ? legacy.requiredBundles : undefined,
      extraPublicDirs: legacy.extraPublicDirs?.length ? legacy.extraPublicDirs : undefined,
    },
  };
}

export async function migratePluginsToPackages(legacyManifests: RepoPath[]) {
  const CODEOWNERS = new Map<string, string[]>(
    (await Fsp.readFile(Path.resolve(REPO_ROOT, '.github/CODEOWNERS'), 'utf8'))
      .split('\n')
      .flatMap((line) => {
        const trim = line.trim();
        // kibanamachine is an assignment override on backport branches to avoid review requests
        if (!trim || trim.startsWith('#') || trim.includes('@kibanamachine')) {
          return [];
        }

        const [dir, ...pings] = trim.split('@');
        return [
          [
            normalizeDir(dir.trim()),
            ['', ...pings]
              .join('@')
              .split(' ')
              .map((h) => h.trim()),
          ],
        ];
      })
  );

  function getCodeowners(dir: string): string[] | null {
    const codeowner = CODEOWNERS.get(normalizeDir(dir));
    if (!codeowner) {
      const parent = Path.dirname(dir);
      if (parent !== dir) {
        return getCodeowners(parent);
      } else {
        return null;
      }
    }

    return codeowner;
  }

  const rewrites: Array<[old: string, path: string, content: string]> = [];
  for (const legacy of legacyManifests) {
    const json = JSON.parse(Fs.readFileSync(legacy.abs, 'utf8'));
    const dir = Path.dirname(legacy.abs);
    const repoRelDir = Path.dirname(legacy.repoRel);
    const codeowners = getCodeowners(repoRelDir);

    const owners =
      codeowners ??
      (isObj(json.owner) && json.owner.githubTeam
        ? [
            `@elastic/${
              json.owner.githubTeam.startsWith('@elastic/')
                ? json.owner.githubTeam.slice(9)
                : json.owner.githubTeam
            }`,
          ]
        : undefined);

    if (!owners) {
      throw new Error(`unable to determine owner for ${legacy.repoRel}`);
    }

    const manifest = getPluginManifest(dir, json, owners);
    if (manifest.owner.length === 1) {
      // unwrap arrays for single owners
      (manifest as any).owner = manifest.owner[0];
    }

    rewrites.push([
      Path.resolve(dir, 'kibana.json'),
      Path.resolve(dir, 'kibana.jsonc'),
      JSON.stringify(manifest, null, 2) + '\n',
    ]);
  }

  await asyncMapWithLimit(rewrites, 30, async ([old, path, content]) => {
    await Fsp.unlink(old);
    await Fsp.writeFile(path, content);
  });
}
