/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fsp from 'fs/promises';

import { REPO_ROOT } from '../../lib/paths.mjs';
import { isDirectory, isFile } from '../../lib/fs.mjs';

const NODE_EXPORT = {
  types: './node.d.ts',
  import: './node.js',
  require: './node.js',
  default: './node.js',
};

/**
 * globby@16 imports `unicorn-magic/node`, but unicorn-magic only exports that
 * subpath for `import`. Cypress's bundled tsx resolves as CJS and fails with
 * ERR_PACKAGE_PATH_NOT_EXPORTED. Add require/default so CJS loaders can resolve it.
 *
 * @param {string} dir
 * @param {number} depth
 * @param {string[]} out
 */
async function collectUnicornMagicPackageJsons(dir, depth, out) {
  if (depth > 8) {
    return;
  }

  let entries;
  try {
    entries = await Fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const ent of entries) {
    if (ent.name === '.bin' || ent.name === '.cache' || ent.name.startsWith('.')) {
      continue;
    }

    const full = Path.join(dir, ent.name);

    if (ent.name === 'unicorn-magic') {
      const pkgPath = Path.join(full, 'package.json');
      if (await isFile(pkgPath)) {
        out.push(pkgPath);
      }
      continue;
    }

    if (ent.name.startsWith('@')) {
      await collectUnicornMagicPackageJsons(full, depth + 1, out);
      continue;
    }

    const nestedNodeModules = Path.join(full, 'node_modules');
    if (await isDirectory(nestedNodeModules)) {
      await collectUnicornMagicPackageJsons(nestedNodeModules, depth + 1, out);
    }
  }
}

/**
 * @param {Record<string, unknown>} nodeExport
 */
function needsCjsExport(nodeExport) {
  if (!nodeExport || typeof nodeExport !== 'object' || Array.isArray(nodeExport)) {
    return true;
  }
  return nodeExport.require !== './node.js' || nodeExport.default !== './node.js';
}

/**
 * @param {import('src/platform/packages/private/kbn-some-dev-log').SomeDevLog} log
 */
export async function patchUnicornMagicExports(log) {
  const nodeModules = Path.resolve(REPO_ROOT, 'node_modules');
  if (!(await isDirectory(nodeModules))) {
    return;
  }

  /** @type {string[]} */
  const packageJsonPaths = [];
  await collectUnicornMagicPackageJsons(nodeModules, 0, packageJsonPaths);

  let patched = 0;
  for (const pkgPath of packageJsonPaths) {
    const raw = await Fsp.readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(raw);
    const nodeExport = pkg.exports?.['./node'];
    if (!nodeExport) {
      continue;
    }
    if (!needsCjsExport(nodeExport)) {
      continue;
    }

    pkg.exports['./node'] = {
      ...NODE_EXPORT,
      ...(typeof nodeExport === 'object' && !Array.isArray(nodeExport) ? nodeExport : {}),
      require: './node.js',
      default: './node.js',
    };

    await Fsp.writeFile(pkgPath, `${JSON.stringify(pkg, null, '\t')}\n`, 'utf8');
    patched += 1;
  }

  if (patched > 0) {
    log.success(
      `patched unicorn-magic exports for CJS (./node) in ${patched} package.json file${
        patched === 1 ? '' : 's'
      }`
    );
  }
}
