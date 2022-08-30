/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { defaultsDeep } from 'lodash';
import { createFlagError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/utils';

import { Config } from './config';
import { EsVersion } from '../es_version';
import { FTR_CONFIGS_MANIFEST_REL, FTR_CONFIGS_MANIFEST_PATHS } from './ftr_configs_manifest';

const cache = new WeakMap();

async function getSettingsFromFile(
  log: ToolingLog,
  esVersion: EsVersion,
  options: {
    path: string;
    settingOverrides: any;
    primary: boolean;
  }
) {
  let resolvedPath;
  try {
    resolvedPath = require.resolve(options.path);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      throw createFlagError(`Unable to find config file [${options.path}]`);
    }

    throw error;
  }

  if (
    options.primary &&
    !FTR_CONFIGS_MANIFEST_PATHS.includes(resolvedPath) &&
    !resolvedPath.includes(`${Path.sep}__fixtures__${Path.sep}`)
  ) {
    const rel = Path.relative(REPO_ROOT, resolvedPath);
    throw createFlagError(
      `Refusing to load FTR Config at [${rel}] which is not listed in [${FTR_CONFIGS_MANIFEST_REL}]. All FTR Config files must be listed there, use the "enabled" key if the FTR Config should be run on automatically on PR CI, or the "disabled" key if it is run manually or by a special job.`
    );
  }

  const configModule = require(resolvedPath); // eslint-disable-line @typescript-eslint/no-var-requires
  const configProvider = configModule.__esModule ? configModule.default : configModule;

  if (!cache.has(configProvider)) {
    log.debug('Loading config file from %j', resolvedPath);
    cache.set(
      configProvider,
      configProvider({
        log,
        esVersion,
        async readConfigFile(p: string, o: any) {
          return new Config({
            settings: await getSettingsFromFile(log, esVersion, {
              path: p,
              settingOverrides: o,
              primary: false,
            }),
            primary: false,
            path: p,
          });
        },
      })
    );
  }

  const settingsWithDefaults: any = defaultsDeep(
    {},
    options.settingOverrides,
    await cache.get(configProvider)!
  );

  return settingsWithDefaults;
}

export async function readConfigFile(
  log: ToolingLog,
  esVersion: EsVersion,
  path: string,
  settingOverrides: any = {}
) {
  return new Config({
    settings: await getSettingsFromFile(log, esVersion, {
      path,
      settingOverrides,
      primary: true,
    }),
    primary: true,
    path,
  });
}
