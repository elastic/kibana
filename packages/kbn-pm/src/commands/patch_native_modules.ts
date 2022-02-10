/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import { CiStatsReporter } from '@kbn/dev-utils/ci_stats_reporter';

import { log } from '../utils/log';
import { spawn } from '../utils/child_process';
import { ICommand } from './index';

export const PatchNativeModulesCommand: ICommand = {
  description: 'Patch native modules by running build commands on M1 Macs',
  name: 'patch_native_modules',

  async run(projects, _, { kbn }) {
    const kibanaProjectPath = projects.get('kibana')?.path || '';
    const reporter = CiStatsReporter.fromEnv(log);

    if (process.platform !== 'darwin' || process.arch !== 'arm64') {
      return;
    }

    const startTime = Date.now();
    const nodeSassDir = Path.resolve(kibanaProjectPath, 'node_modules/node-sass');
    const nodeSassNativeDist = Path.resolve(
      nodeSassDir,
      `vendor/darwin-arm64-${process.versions.modules}/binding.node`
    );
    if (!Fs.existsSync(nodeSassNativeDist)) {
      log.info('Running build script for node-sass');
      await spawn('npm', ['run', 'build'], {
        cwd: nodeSassDir,
      });
    }

    const re2Dir = Path.resolve(kibanaProjectPath, 'node_modules/re2');
    const re2NativeDist = Path.resolve(re2Dir, 'build/Release/re2.node');
    if (!Fs.existsSync(re2NativeDist)) {
      log.info('Running build script for re2');
      await spawn('npm', ['run', 'rebuild'], {
        cwd: re2Dir,
      });
    }

    log.success('native modules should be setup for native ARM Mac development');

    // send timings
    await reporter.timings({
      upstreamBranch: kbn.kibanaProject.json.branch,
      // prevent loading @kbn/utils by passing null
      kibanaUuid: kbn.getUuid() || null,
      timings: [
        {
          group: 'scripts/kbn bootstrap',
          id: 'patch native modudles for arm macs',
          ms: Date.now() - startTime,
        },
      ],
    });
  },
};
