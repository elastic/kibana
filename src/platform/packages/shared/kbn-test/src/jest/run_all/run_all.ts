/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import { run } from '@kbn/dev-cli-runner';
import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import { yargsOptions } from 'jest-cli';
import { readConfig, readInitialOptions } from 'jest-config';
import { castArray } from 'lodash';
import pLimit from 'p-limit';
import Path from 'path';
import yargs from 'yargs';
import { SCOUT_REPORTER_ENABLED } from '@kbn/scout-info';
import objectHash from 'object-hash';
import { expandConfigPaths } from './expand_config_paths';
import { getFullConfigs } from './get_full_configs';
import { groupConfigs } from './group_configs';
import { writeRetriesFile } from './write_retries_file';

export function runJestAll() {
  run(
    async ({ flags, log }) => {
      // Import default Jest configuration
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const defaultJestConfig = require('./run_jest_all.config');

      let list: string[] = [];

      if (flags.config) {
        // --config can be provided multiple times or as a comma-separated list
        list.push(
          ...castArray(flags.config)
            .flatMap((v) => v.split(','))
            .map((v) => v.trim())
            .filter(Boolean)
        );
      }
      if (!list.length) {
        throw new Error('No configs provided. Use --config <path1,path2,...>');
      }

      list = expandConfigPaths(list);

      log.debug(`Found ${list.length} configs`);

      if (!list.length) {
        throw new Error(`No config paths found for ${flags.config}`);
      }

      const limiter = pLimit(50);

      // Remove all our custom flags (defined in the flags config) before passing to Jest's readConfig
      // Only keep `_` from yargs.argv and filter out: group, config, c (alias)
      const originalArgv = yargs.argv as any;
      const jestOnlyArgv = {
        _: originalArgv._,
        $0: originalArgv.$0 || 'jest', // Required by Jest's Argv interface
        // Filter out all keys that are in our flags config
        ...Object.fromEntries(
          Object.entries(originalArgv).filter(
            ([key]) => !['group', 'config', 'c'].includes(key) && key !== '_' && key !== '$0'
          )
        ),
      };

      const dataDir = Path.join(REPO_ROOT, 'data', 'jest-run-all');

      await Fs.promises.mkdir(dataDir, { recursive: true });

      const { globalConfig } = await readConfig(
        jestOnlyArgv,
        require.resolve('./run_jest_all.config.js')
      );

      const configs = await Promise.all(
        list.map(async (configPath) => {
          return await limiter(() => readInitialOptions(configPath));
        })
      );

      const configsToRun = flags.group
        ? groupConfigs({
            log,
            globalConfig,
            configs,
          })
        : configs.map((cfg) => cfg.config);

      log.info(`Running ${configsToRun.length} configs`);

      const retriesFile = await writeRetriesFile({ dataDir, retries: 3, log });

      const jestArgv = yargs.options(yargsOptions).parse();

      const fullConfigs = await getFullConfigs({
        argv: jestArgv,
        configs: configsToRun,
        dataDir,
        log,
      });

      for (let i = 0; i < fullConfigs.length; i++) {
        const jestConfig = fullConfigs[i];

        const initialConfig = configsToRun[i];

        const setupFilesAfterEnv = [
          ...(jestConfig.projectConfig.setupFilesAfterEnv ?? []),
          retriesFile,
        ];

        const initialRunConfig = {
          ...initialConfig,
          ...defaultJestConfig,
          setupFilesAfterEnv,
        };

        const hash = objectHash(initialConfig);

        const dir = Path.join(dataDir, hash);

        await Fs.promises.mkdir(dir, { recursive: true });

        const initialRunConfigFilepath = Path.join(dir, `jest.config.initial.json`);

        await Fs.promises.writeFile(
          initialRunConfigFilepath,
          JSON.stringify(initialRunConfig),
          'utf8'
        );

        // Set up environment for Jest
        if (SCOUT_REPORTER_ENABLED) {
          process.env.JEST_CONFIG_PATH = initialRunConfigFilepath;
        }

        // First attempt with retries
        try {
          log.info(`Running Jest with retries for ${initialRunConfigFilepath}...`);
          await execa(
            'node',
            [Path.join(REPO_ROOT, 'scripts/jest'), '--config', initialRunConfigFilepath],
            {
              stdio: 'inherit',
              env: SCOUT_REPORTER_ENABLED
                ? { ...process.env, JEST_CONFIG_PATH: initialRunConfigFilepath }
                : process.env,
            }
          );
        } catch (firstAttemptError) {
          log.warning('First attempt failed, retrying without retries...');

          // Second attempt without retries
          try {
            log.info(`Running Jest without retries for ${initialRunConfigFilepath}...`);
            await execa(
              'node',
              [
                Path.join(REPO_ROOT, 'scripts/jest'),
                '--config',
                initialRunConfigFilepath,
                '--onlyFailures',
                '--runInBand',
              ],
              {
                stdio: 'inherit',
                env: SCOUT_REPORTER_ENABLED
                  ? { ...process.env, JEST_CONFIG_PATH: initialRunConfigFilepath }
                  : process.env,
              }
            );
          } catch (secondAttemptError) {
            log.error(`Both attempts failed for ${initialRunConfigFilepath}`);
            throw secondAttemptError;
          }
        }
      }
    },
    {
      flags: {
        boolean: ['group'],
        string: ['config'],
        alias: {
          c: 'config',
        },
        allowUnexpected: true,
        default: {
          group: true,
        },
      } as const,
    }
  );
}
