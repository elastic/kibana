/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable no-restricted-syntax */

require('../src/setup_node_env');

const Path = require('path');

const { REPO_ROOT } = require('@kbn/repo-info');
const { readPackageMap } = require('@kbn/package-map');
const { PROJECTS } = require('../src/dev/typescript/projects');

const pkgMap = readPackageMap();
const dirsToIds = new Map(Array.from(pkgMap).map(([k, v]) => [v, k]));
const directDeps = new Map();
for (const project of PROJECTS) {
  const repoRel = Path.relative(REPO_ROOT, project.directory);
  const refId = dirsToIds.get(repoRel) ?? Path.join(repoRel, 'tsconfig.json');
  const deps = (project.config.kbn_references ?? []).map((r) =>
    typeof r === 'string' ? r : r.path
  );
  directDeps.set(refId, deps);
}

function traverse(pkgId, path) {
  if (path.includes(pkgId)) {
    throw [...path.slice(path.indexOf(pkgId)), pkgId];
  }

  for (const dep of directDeps.get(pkgId) ?? []) {
    traverse(dep, [...path, pkgId]);
  }
}

const seen = new Set();
for (const pkgId of directDeps.keys()) {
  try {
    traverse(pkgId, []);
  } catch (error) {
    if (!Array.isArray(error)) {
      throw error;
    }

    const key = error
      .slice(1)
      .sort((a, b) => a.localeCompare(b))
      .join(':');

    if (!seen.has(key)) {
      seen.add(key);
      console.log(`Cycle found:\n  ${error.join(' ->\n  ')}`);
      console.log();
    }
  }
}
