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

/** @param {string} specifier */
function isLinkOrWorkspace(specifier) {
  return specifier.startsWith('link:') || specifier.startsWith('workspace:');
}

/**
 * @param {import('@kbn/repo-info').KibanaPackageJson['dependencies']} deps
 */
function managedKbnEntries(deps) {
  return new Map(
    Object.entries(deps).filter(
      ([name, specifier]) => name.startsWith('@kbn/') && isLinkOrWorkspace(specifier)
    )
  );
}

/**
 * @param {import('@kbn/repo-packages').Package[]} pkgs
 * @param {import('@kbn/repo-info').KibanaPackageJson} pkgJson
 * @param {boolean} devOnly
 */
function expectedWorkspaceEntries(pkgs, pkgJson, devOnly) {
  return new Map(
    pkgs
      .filter((p) => p.isDevOnly() === devOnly)
      .filter((p) => {
        const current =
          pkgJson.dependencies[p.manifest.id] ?? pkgJson.devDependencies[p.manifest.id];
        return current === undefined || isLinkOrWorkspace(current);
      })
      .map((p) => [p.manifest.id, 'workspace:*'])
  );
}

/**
 * @param {import('@kbn/repo-info').KibanaPackageJson['dependencies']} depsObj
 * @param {Map<string, string>} actual
 * @param {Map<string, string>} expected
 */
function updatePkgEntries(depsObj, actual, expected) {
  let changes = false;
  const keys = new Set([...actual.keys(), ...expected.keys()]);
  for (const key of keys) {
    const a = actual.get(key);
    const e = expected.get(key);

    // if expected and actual match then we don't need to do anything
    if (a === e) {
      continue;
    }

    changes = true;

    // if expected is undefined then this key shouldn't be set
    if (e === undefined) {
      delete depsObj[key];
      continue;
    }

    // otherwise we just need to update/add this key/value
    depsObj[key] = e;
  }
  return changes;
}

/**
 * Updates the package.json file with the latest dependencies from the workspace.
 * @param {import('@kbn/repo-packages').Package[]} pkgs
 * @param {import('src/platform/packages/private/kbn-some-dev-log').SomeDevLog} log
 */
export async function updatePackageJson(pkgs, log) {
  const path = Path.resolve(REPO_ROOT, 'package.json');
  /** @type {import('@kbn/repo-info').KibanaPackageJson} */
  const pkgJson = JSON.parse(await Fsp.readFile(path, 'utf8'));

  let changes = false;
  const typesInProd = Object.keys(pkgJson.dependencies).filter((id) => id.startsWith('@types/'));
  for (const t of typesInProd) {
    changes = true;
    pkgJson.devDependencies[t] = pkgJson.dependencies[t];
    delete pkgJson.dependencies[t];
  }

  changes ||= updatePkgEntries(
    pkgJson.dependencies,
    managedKbnEntries(pkgJson.dependencies),
    expectedWorkspaceEntries(pkgs, pkgJson, false)
  );

  changes ||= updatePkgEntries(
    pkgJson.devDependencies,
    managedKbnEntries(pkgJson.devDependencies),
    expectedWorkspaceEntries(pkgs, pkgJson, true)
  );

  if (changes) {
    await Fsp.writeFile(path, JSON.stringify(pkgJson, null, 2));
    log.warning('updated package.json');
  }
}
