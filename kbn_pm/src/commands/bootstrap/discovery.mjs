/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';
import ChildProcess from 'child_process';
import { promisify } from 'util';

import { REPO_ROOT } from '../../lib/paths.mjs';
const execAsync = promisify(ChildProcess.execFile);

export async function discovery() {
  const { getPluginSearchPaths, simpleKibanaPlatformPluginDiscovery } = await import(
    // eslint-disable-next-line @kbn/imports/uniform_imports
    '../../../../packages/kbn-plugin-discovery/index.js'
  );

  const { Package } = await import(
    // we need to run this before we install node modules, so it can't rely on @kbn/* imports
    // eslint-disable-next-line @kbn/imports/uniform_imports
    '../../../../packages/kbn-repo-packages/index.js'
  );

  const proc = await execAsync('git', ['ls-files', '-comt', '--exclude-standard'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: Infinity,
  });

  const paths = new Map();
  /** @type {Map<string, Set<string>>} */
  const filesByName = new Map();

  for (const raw of proc.stdout.split('\n')) {
    const line = raw.trim();
    if (!line) {
      continue;
    }

    const repoRel = line.slice(2); // trim the single char status and separating space from the line
    const name = repoRel.split('/').pop();
    if (name !== 'kibana.jsonc' && name !== 'tsconfig.json') {
      continue;
    }

    const existingPath = paths.get(repoRel);
    const path = existingPath ?? Path.resolve(REPO_ROOT, repoRel);
    if (!existingPath) {
      paths.set(repoRel, path);
    }

    let files = filesByName.get(name);
    if (!files) {
      files = new Set();
      filesByName.set(name, files);
    }

    if (line.startsWith('C ')) {
      // this line indicates that the previous path is changed in the working
      // tree, so we need to determine if it was deleted and remove it if so
      if (!Fs.existsSync(path)) {
        files.delete(path);
      }
    } else {
      files.add(path);
    }
  }

  return {
    plugins: simpleKibanaPlatformPluginDiscovery(
      getPluginSearchPaths({
        rootDir: REPO_ROOT,
        examples: true,
        oss: false,
        testPlugins: true,
      }),
      []
    ),
    tsConfigsPaths: Array.from(filesByName.get('tsconfig.json') ?? new Set()),
    packages: Array.from(filesByName.get('kibana.jsonc') ?? new Set())
      .map((path) => Package.fromManifest(REPO_ROOT, path))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}
