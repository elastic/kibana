/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';
import Fsp from 'fs/promises';

import { asyncMapWithLimit } from '../lib/async.mjs';
import External from '../lib/external_packages.js';
import { createCliError } from '../lib/cli_error.mjs';
import { REPO_ROOT } from '../lib/paths.mjs';

/**
 * @type {Map<string, boolean>}
 */
const validPkgDirCache = new Map();
/**
 * @param {string} dir
 */
function validatePkgDir(dir) {
  const cached = validPkgDirCache.get(dir);
  if (cached !== undefined) {
    return cached;
  }

  const valid = Fs.existsSync(Path.resolve(REPO_ROOT, dir, 'tsconfig.json'));
  validPkgDirCache.set(dir, valid);
  return valid;
}

/**
 * @param {import('@babel/types').Node} node
 */
function getEnds(node) {
  const { start, end } = node;
  if (start == null || end == null) {
    throw createCliError(`node is missing start/end indexes`);
  }
  return [start, end];
}

/** @type {import('../lib/command').Command} */
export const command = {
  name: '_x',
  async run({ log }) {
    const { default: globby } = await import('globby');
    const { parseExpression } = await import('@babel/parser');
    const T = await import('@babel/types');
    const { PROJECTS } = /** @type {import('../../../src/dev/typescript/projects')} */ (
      External.reqAbs(Path.resolve(REPO_ROOT, 'src/dev/typescript/projects.ts'))
    );
    const { readPackageMap } = External['@kbn/package-map']();

    const pkgMap = readPackageMap();
    const dirsToPkgIds = new Map(Array.from(pkgMap).map(([k, v]) => [v, k]));

    const pathsAndProjects = await asyncMapWithLimit(PROJECTS, 5, async (proj) => {
      const paths = await globby(proj.getIncludePatterns(), {
        ignore: proj.getExcludePatterns(),
        cwd: proj.directory,
        onlyFiles: true,
        absolute: true,
      });

      return {
        proj,
        paths,
      };
    });

    for (const { proj, paths } of pathsAndProjects) {
      const ownPkgId = dirsToPkgIds.get(Path.relative(REPO_ROOT, proj.directory));

      /** @type {Set<string>} */
      const importedPkgIds = new Set();
      await asyncMapWithLimit(paths, 30, async (path) => {
        const content = await Fsp.readFile(path, 'utf8');
        for (const match of content.matchAll(/from '(@kbn\/[^'\/]+)/g)) {
          if (match[1] !== ownPkgId) {
            importedPkgIds.add(match[1]);
          }
        }
      });

      const currentRefs = Array.from(proj.config.kbn_references ?? []);
      const newRefs = [];
      for (const id of importedPkgIds) {
        const pkgDir = pkgMap.get(id);
        if (!pkgDir) {
          log.warning('unknown pkg dir for', id);
          continue;
        }

        if (!validatePkgDir(pkgDir)) {
          log.warning('missing tsconfig for', id);
          continue;
        }

        if (!currentRefs.includes(id)) {
          newRefs.push(id);
        }
      }

      if (!newRefs.length) {
        continue;
      }

      let jsonc = await Fsp.readFile(proj.tsConfigPath, 'utf8');
      if (!jsonc.includes('"kbn_references"')) {
        jsonc = jsonc.replace(/,?\n\s*}\s*$/, ',\n  "kbn_references": []\n}\n');
      }

      let ast;
      try {
        ast = parseExpression(jsonc);
      } catch (error) {
        throw new Error(`unable to parse tsconfig file at ${proj.tsConfigPath}: ${error.stack}`);
      }

      if (!T.isObjectExpression(ast)) {
        throw createCliError(`expected file to be a JSON object: ${proj.tsConfigPath}`);
      }

      const refsProp = ast.properties.find(
        /** @returns {p is import('@babel/types').ObjectProperty} */
        (p) => T.isObjectProperty(p) && T.isStringLiteral(p.key) && p.key.value === 'kbn_references'
      );

      if (!refsProp) {
        throw createCliError(`missing kbn_references prop in ${proj.tsConfigPath}`);
      }
      if (!T.isArrayExpression(refsProp.value)) {
        throw createCliError(
          `expected kbn_references property value to be an array in ${proj.tsConfigPath}`
        );
      }

      const lastValue = refsProp.value.elements.at(-1);
      let updated;
      if (!lastValue || lastValue.loc?.start.line === refsProp.loc?.start.line) {
        // expand multiline, or setup from scratch
        const [start, end] = getEnds(refsProp);
        const list = [...currentRefs, ...newRefs]
          .map((ref) => {
            if (typeof ref === 'string') {
              return `    ${JSON.stringify(ref)},`;
            }
            return `    { "path": ${JSON.stringify(ref.path)} },`;
          })
          .join('\n');

        updated = jsonc.slice(0, start) + `"kbn_references": [\n${list}\n  ]` + jsonc.slice(end);
      } else {
        const { end } = lastValue;
        if (end == null) {
          throw createCliError(`missing end index of node`);
        }

        const list = newRefs.map((ref) => `    ${JSON.stringify(ref)},`).join('\n');
        updated =
          jsonc.slice(0, end) + `,\n${list}` + jsonc.slice(jsonc[end] === ',' ? end + 1 : end);
      }

      await Fsp.writeFile(proj.tsConfigPath, updated);
      log.success('updated', Path.relative(process.cwd(), proj.tsConfigPath));
    }
  },
};
