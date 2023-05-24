/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join, resolve } from 'path';
import { accessSync, constants } from 'fs';
import { TypeOf, schema } from '@kbn/config-schema';
import { REPO_ROOT } from '@kbn/repo-info';
import { getConfigFromFiles } from '@kbn/config';
import getopts from 'getopts';

const isString = (v: any): v is string => typeof v === 'string';

const buildConfigPaths = () => {
  return [
    process.env.KBN_PATH_CONF && join(process.env.KBN_PATH_CONF, 'kibana.yml'),
    join(REPO_ROOT, 'config/kibana.yml'),
    '/etc/kibana/kibana.yml',
  ].filter(isString);
};

const CONFIG_DIRECTORIES = [
  process.env.KBN_PATH_CONF,
  join(REPO_ROOT, 'config'),
  '/etc/kibana',
].filter(isString);

const LOGS_PATHS = [join(REPO_ROOT, 'logs'), '/var/log/kibana'].filter(isString);

function findFile(paths: string[]) {
  const availablePath = paths.find((configPath) => {
    try {
      accessSync(configPath, constants.R_OK);
      return true;
    } catch (e) {
      // Check the next path
    }
  });
  return availablePath || paths[0];
}

export const buildDataPaths = (): string[] => {
  const configDataPath = getConfigFromFiles([getConfigPath()]).path?.data;
  const argv = process.argv.slice(2);
  const options = getopts(argv, {
    string: ['pathData'],
    alias: {
      pathData: 'path.data',
    },
  });

  return [
    !!options.pathData && resolve(REPO_ROOT, options.pathData),
    configDataPath && resolve(REPO_ROOT, configDataPath),
    join(REPO_ROOT, 'data'),
    '/var/lib/kibana',
  ].filter(isString);
};

/**
 * Get the path of kibana.yml
 * @internal
 */
export const getConfigPath = () => findFile(buildConfigPaths());

/**
 * Get the directory containing configuration files
 * @internal
 */
export const getConfigDirectory = () => findFile(CONFIG_DIRECTORIES);

/**
 * Get the directory containing runtime data
 * @internal
 */
export const getDataPath = () => findFile(buildDataPaths());

/**
 * Get the directory containing logs
 * @internal
 */
export const getLogsPath = () => findFile(LOGS_PATHS);

export type PathConfigType = TypeOf<typeof config.schema>;

export const config = {
  path: 'path',
  schema: schema.object({
    data: schema.string({ defaultValue: () => getDataPath() }),
  }),
};
