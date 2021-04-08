/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import { promisify } from 'util';
import path from 'path';
import json5 from 'json5';
import execa from 'execa';
import { omit } from 'lodash';

import {
  PROJECT_TS_CONFIG_FILES,
  TS_CONFIG_FILES,
  KIBANA_ROOT,
  TS_CONFIG_TEMPLATE,
  TS_CONFIG_TEST_TEMPLATE,
} from './paths';
import { deoptimize } from './deoptimize';

const NOTIFICATION = `
// THIS CONFIGURATION HAS BEEN OPTIMIZED FOR PRESENTATION TEAM DEVELOPMENT.
// These optimizations can be reversed:
//    [/src/plugins/presentation_util] node scripts/optimize_tsconfig --revert
//

// See: /src/plugins/presentation_util/scripts/optimize_tsconfig for details

`;

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

async function prepareBaseTsConfig() {
  const baseConfigFilename = path.resolve(KIBANA_ROOT, 'tsconfig.base.json');
  const config = json5.parse(await readFile(baseConfigFilename, 'utf-8'));

  await writeFile(
    baseConfigFilename,
    JSON.stringify(
      {
        ...omit(config, 'references'),
        compilerOptions: {
          ...config.compilerOptions,
          incremental: false,
        },
        include: [],
      },
      null,
      2
    ),
    { encoding: 'utf-8' }
  );
}

async function addFilesToRootTsConfig() {
  const template = json5.parse(await readFile(TS_CONFIG_TEMPLATE, 'utf-8'));
  const rootTsConfigFilename = path.join(KIBANA_ROOT, 'tsconfig.json');
  const rootTsConfig = json5.parse(await readFile(rootTsConfigFilename, 'utf-8'));

  await writeFile(
    rootTsConfigFilename,
    `${NOTIFICATION} ${JSON.stringify({ ...rootTsConfig, ...template, references: [] }, null, 2)}`,
    { encoding: 'utf-8' }
  );
}

async function addFilesToTestTsConfig() {
  const template = json5.parse(await readFile(TS_CONFIG_TEST_TEMPLATE, 'utf-8'));
  const testTsConfigFilename = path.join(KIBANA_ROOT, 'x-pack/test/tsconfig.json');
  const testTsConfig = json5.parse(await readFile(testTsConfigFilename, 'utf-8'));

  await writeFile(
    testTsConfigFilename,
    `${NOTIFICATION} ${JSON.stringify({ ...testTsConfig, ...template, references: [] }, null, 2)}`,
    { encoding: 'utf-8' }
  );
}

async function setIgnoreChanges() {
  for (const filename of TS_CONFIG_FILES) {
    await execa('git', ['update-index', '--skip-worktree', filename]);
  }
}

async function deleteTsConfigs() {
  for (const filename of PROJECT_TS_CONFIG_FILES) {
    await unlink(filename);
  }
}

export const optimize = async () => {
  await deoptimize();
  await prepareBaseTsConfig();
  await addFilesToRootTsConfig();
  await addFilesToTestTsConfig();
  await deleteTsConfigs();
  await setIgnoreChanges();

  // eslint-disable-next-line no-console
  console.log(
    'Created an optimized tsconfig.json. To undo these changes, run `./scripts/unoptimize-tsconfig.js`'
  );
};
