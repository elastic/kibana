/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Run Jest tests
//
// Provides Jest with `--config` to the first jest.config.js file found in the current
// directory, or while going up in the directory chain. If the current working directory
// is nested under the config path, a pattern will be provided to Jest to only run the
// tests within that directory.
//
// Any additional options passed will be forwarded to Jest.
//
// See all cli options in https://facebook.github.io/jest/docs/cli.html

import { resolve, relative, sep as osSep } from 'path';
import { existsSync } from 'fs';
import { run } from 'jest';
import { buildArgv } from 'jest-cli/build/cli';
import { ToolingLog, getTimeReporter } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';
import { map } from 'lodash';

// yarn test:jest src/core/server/saved_objects
// yarn test:jest src/core/public/core_system.test.ts
// :kibana/src/core/server/saved_objects yarn test:jest

// Patch node 16 types to be compatible with jest 26
// https://github.com/facebook/jest/issues/11640#issuecomment-893867514
/* eslint-disable */
declare global {
  namespace NodeJS {
    interface Global {}
    interface InspectOptions {}

    interface ConsoleConstructor extends console.ConsoleConstructor {}
  }
}
/* eslint-enable */

export function runJest(configName = 'jest.config.js') {
  const argv = buildArgv(process.argv);
  const devConfigName = 'jest.config.dev.js';

  const log = new ToolingLog({
    level: argv.verbose ? 'verbose' : 'info',
    writeTo: process.stdout,
  });

  const runStartTime = Date.now();
  const reportTime = getTimeReporter(log, 'scripts/jest');

  let testFiles: string[];

  const cwd: string = process.env.INIT_CWD || process.cwd();

  if (!argv.config) {
    testFiles = argv._.splice(2).map((p) => resolve(cwd, p.toString()));
    const commonTestFiles = commonBasePath(testFiles);
    const testFilesProvided = testFiles.length > 0;

    log.verbose('cwd:', cwd);
    log.verbose('testFiles:', testFiles.join(', '));
    log.verbose('commonTestFiles:', commonTestFiles);

    let configPath;

    // sets the working directory to the cwd or the common
    // base directory of the provided test files
    let wd = testFilesProvided ? commonTestFiles : cwd;
    while (true) {
      const dev = resolve(wd, devConfigName);
      if (existsSync(dev)) {
        configPath = dev;
        break;
      }

      const actual = resolve(wd, configName);
      if (existsSync(actual)) {
        configPath = actual;
        break;
      }

      if (wd === REPO_ROOT) {
        break;
      }

      const parent = resolve(wd, '..');
      if (parent === wd) {
        break;
      }

      wd = parent;
    }

    if (!configPath) {
      if (testFilesProvided) {
        log.error(
          `unable to find a ${configName} file in ${commonTestFiles} or any parent directory up to the root of the repo. This CLI can only run Jest tests which resolve to a single ${configName} file, and that file must exist in a parent directory of all the paths you pass.`
        );
      } else {
        log.error(
          `we no longer ship a root config file so you either need to pass a path to a test file, a folder where tests can be found, or a --config argument pointing to one of the many ${configName} files in the repository`
        );
      }

      process.exit(1);
    }

    log.verbose(`no config provided, found ${configPath}`);
    process.argv.push('--config', configPath);

    if (!testFilesProvided) {
      log.verbose(`no test files provided, setting to current directory`);
      process.argv.push(relative(wd, cwd));
    }

    log.info('yarn jest', process.argv.slice(2).join(' '));
  }

  if (process.env.NODE_ENV == null) {
    process.env.NODE_ENV = 'test';
  }

  run().then(() => {
    // Success means that tests finished, doesn't mean they passed.
    reportTime(runStartTime, 'total', {
      success: true,
      isXpack: cwd.includes('x-pack'),
      testFiles: map(testFiles, (testFile) => relative(cwd, testFile)),
    });
  });
}

/**
 * Finds the common basePath by sorting the array
 * and comparing the first and last element
 */
export function commonBasePath(paths: string[] = [], sep = osSep) {
  if (paths.length === 0) return '';

  paths = paths.concat().sort();

  const first = paths[0].split(sep);
  const last = paths[paths.length - 1].split(sep);

  const length = first.length;
  let i = 0;

  while (i < length && first[i] === last[i]) {
    i++;
  }

  return first.slice(0, i).join(sep);
}
