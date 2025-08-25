/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import Path from 'path';
import Fs from 'fs';
import type { Config } from '@jest/types';
import type { ToolingLog } from '@kbn/tooling-log';
import { readConfig } from 'jest-config';
import { createConfigHash } from './create_config_hash';

export async function getFullConfigs({
  log,
  argv,
  configs,
  dataDir,
}: {
  log: ToolingLog;
  argv: Config.Argv;
  configs: Config.InitialOptions[];
  dataDir: string;
}) {
  const fullConfigs = await Promise.all(
    configs.map(async (config) => {
      const dir = Path.join(dataDir, createConfigHash(config));

      await Fs.promises.mkdir(dir, { recursive: true });
      const configPath = Path.join(dir, 'jest.config.json');

      log.debug(`Writing config file to disk: ${configPath}`);

      await Fs.promises.writeFile(configPath, JSON.stringify(config), 'utf8');
      const options = await readConfig(argv, config, undefined, dir);

      return options;
    })
  );

  return fullConfigs;
}
