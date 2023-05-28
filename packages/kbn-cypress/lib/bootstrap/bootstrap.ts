/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getBinPath } from 'cy2';
import Debug from 'debug';
import execa, { ExecaError } from 'execa';
import fs from 'fs';
import { ValidatedCurrentsParameters } from '../../types';
import { ValidationError } from '../errors';
import { createTempFile } from '../fs';
import { bold, info } from '../log';
// import { require } from '../require';
import { getBootstrapArgs } from './serializer';

const debug = Debug('currents:boot');

export const bootCypress = async (port: number, params: ValidatedCurrentsParameters) => {
  debug('booting cypress...');
  const tempFilePath = await createTempFile();

  const cypressBin = await getBinPath(require.resolve('cypress'));
  debug('cypress executable location: %s', cypressBin);

  // it is important to pass the same args in order to get the same config as for the actual run
  const args = getBootstrapArgs({ port, tempFilePath, params });
  debug('booting cypress with args: %o', args);
  const { stdout, stderr } = await execCypress(cypressBin, args);

  if (!fs.existsSync(tempFilePath)) {
    throw new Error(
      `Cannot resolve cypress configuration from ${tempFilePath}. Please report the issue.`
    );
  }
  try {
    const f = fs.readFileSync(tempFilePath, 'utf-8');
    if (!f) {
      throw new Error('Is cypress-cloud/plugin installed?');
    }
    debug("cypress config '%s': '%s'", tempFilePath, f);
    return JSON.parse(f);
  } catch (err) {
    debug('read config temp file failed: %o', err);
    info(bold('Cypress stdout:\n'), stdout);
    info(bold('Cypress stderr:\n'), stderr);

    throw new ValidationError(`Unable to resolve cypress configuration
- make sure that 'cypress-cloud/plugin' is installed
- report the issue together with cypress stdout and stderr
`);
  }
};

async function execCypress(cypressBin: string, args: readonly string[]) {
  let stdout = '';
  let stderr = '';
  try {
    await execa(cypressBin, ['run', ...args], {
      stdio: 'pipe',
      env: {
        ...process.env,
        // prevent warnings about recording mode
        CYPRESS_RECORD_KEY: undefined,
        CYPRESS_PROJECT_ID: undefined,
      },
    });
  } catch (err) {
    debug('exec cypress failed (certain failures are expected): %o', err);
    stdout = (err as ExecaError).stdout;
    stderr = (err as ExecaError).stderr;
  }
  return { stdout, stderr };
}
