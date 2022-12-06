/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import { createCliError } from '../lib/cli_error.mjs';
import External from '../lib/external_packages.js';
import { REPO_ROOT } from '../lib/paths.mjs';

const __dirname = Path.dirname(new URL(import.meta.url).pathname);

/** @type {import('../lib/command').Command} */
export const command = {
  name: '_x',
  async run({ log }) {
    const filtered = (
      await External['@kbn/bazel-packages']().discoverBazelPackages(REPO_ROOT)
    ).filter((p) => p.hasBuildTypesRule());

    const { parseBazelFiles } = /** @type {import('./bazel_reader')} */ (
      External.reqAbs(Path.resolve(__dirname, 'bazel_reader.ts'))
    );

    const { getRefdPkgs } = /** @type {import('./get_refs')} */ (
      External.reqAbs(Path.resolve(__dirname, 'get_refs.ts'))
    );

    const { readPackageManifest } = External['@kbn/bazel-packages']();

    const parsedBazelFiles = await parseBazelFiles(
      filtered.map((p) => Path.resolve(REPO_ROOT, p.normalizedRepoRelativeDir, 'BUILD.bazel'))
    );

    for (const pkg of filtered) {
      const dir = Path.resolve(REPO_ROOT, pkg.normalizedRepoRelativeDir);
      const ast = parsedBazelFiles.get(Path.resolve(dir, 'BUILD.bazel'));
      if (!ast) {
        throw new Error(`missing ast for ${pkg.manifest.id}`);
      }

      const tsconfigPath = Path.resolve(dir, 'tsconfig.json');
      const jsonc = Fs.readFileSync(tsconfigPath, 'utf8');

      const refs = getRefdPkgs(ast).map(
        (p) => readPackageManifest(Path.resolve(REPO_ROOT, p, 'kibana.jsonc')).id
      );
      if (!refs.length) {
        continue;
      }

      const refsSnippet = `,\n  "kbn_references": [
    ${refs.map((p) => JSON.stringify(p)).join(',\n    ')}
  ]`;
      const endI = jsonc.lastIndexOf('}');
      if (endI === -1 || jsonc[endI - 1] !== '\n') {
        throw createCliError(`expected last } to be on its own line`);
      }

      const start = jsonc[endI - 2] === ',' ? endI - 2 : endI - 1;

      Fs.writeFileSync(
        tsconfigPath,
        `${jsonc.slice(0, start)}${refsSnippet}${jsonc.slice(start)}`,
        'utf8'
      );

      log.success('updated', tsconfigPath);
    }
  },
};
