/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs/promises';

import dedent from 'dedent';
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/utils';
import normalize from 'normalize-path';

import { PROJECTS } from './projects';

export const ROOT_REFS_CONFIG_PATH = Path.resolve(REPO_ROOT, 'tsconfig.refs.json');
export const REF_CONFIG_PATHS = [ROOT_REFS_CONFIG_PATH];

async function isRootRefsConfigSelfManaged() {
  try {
    const currentRefsFile = await Fs.readFile(ROOT_REFS_CONFIG_PATH, 'utf-8');
    return currentRefsFile.trim().startsWith('// SELF MANAGED');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

function generateTsConfig(refs: string[]) {
  return dedent`
    // This file is automatically updated when you run \`node scripts/build_ts_refs\`. If you start this
    // file with the text "// SELF MANAGED" then you can comment out any projects that you like and only
    // build types for specific projects and their dependencies
    {
      "include": [],
      "references": [
${refs.map((p) => `        { "path": ${JSON.stringify(p)} },`).join('\n')}
      ]
    }
  `;
}

export async function updateRootRefsConfig(log: ToolingLog) {
  if (await isRootRefsConfigSelfManaged()) {
    log.warning(
      'tsconfig.refs.json starts with "// SELF MANAGED" so not updating to include all projects'
    );
    return;
  }

  const refs = PROJECTS.filter((p) => p.isCompositeProject())
    .map((p) => `./${normalize(Path.relative(REPO_ROOT, p.tsConfigPath))}`)
    .sort((a, b) => a.localeCompare(b));

  log.debug('updating', ROOT_REFS_CONFIG_PATH);
  await Fs.writeFile(ROOT_REFS_CONFIG_PATH, generateTsConfig(refs) + '\n');
}
