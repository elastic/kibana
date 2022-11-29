/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import chalk from 'chalk';
import execa from 'execa';
import { ES_KEYSTORE_BIN } from '../paths';
import { log as defaultLog } from './log';

export async function createKeystore(installPath: string) {
  const env = { JAVA_HOME: '' };
  await execa(ES_KEYSTORE_BIN, ['create'], { cwd: installPath, env });
}

/**
 * Creates and configures Keystore
 */
export async function configureKeystore(
  installPath: string,
  log: ToolingLog = defaultLog,
  secureSettings: Array<[string, string]>
) {
  const env = { JAVA_HOME: '' };

  for (const [secureSettingName, secureSettingValue] of secureSettings) {
    log.info(
      `setting secure setting %s to %s`,
      chalk.bold(secureSettingName),
      chalk.bold(secureSettingValue)
    );

    await execa(ES_KEYSTORE_BIN, ['add', secureSettingName, '-x', '-f'], {
      input: secureSettingValue,
      cwd: installPath,
      env,
    });
  }
}
