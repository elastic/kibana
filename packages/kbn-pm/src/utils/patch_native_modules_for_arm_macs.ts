/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import { ToolingLog } from '@kbn/dev-utils';

import { spawn } from './child_process';

export async function patchNativeModulesForArmMacs(log: ToolingLog, kibanaProjectPath: string) {
  const nodeSassDir = Path.resolve(kibanaProjectPath, 'node_modules/node-sass');
  const nodeSassNativeDist = Path.resolve(
    nodeSassDir,
    `vendor/darwin-arm64-${process.versions.modules}/binding.node`
  );
  const re2Dir = Path.resolve(kibanaProjectPath, 'node_modules/re2');
  const re2NativeDist = Path.resolve(re2Dir, 'build/Release/re2.node');

  if (!Fs.existsSync(nodeSassNativeDist)) {
    log.info('Running build script for node-sass');
    await spawn('npm', ['run', 'build'], {
      cwd: nodeSassDir,
    });
  }

  if (!Fs.existsSync(re2NativeDist)) {
    log.info('Running build script for re2');
    await spawn('npm', ['run', 'rebuild'], {
      cwd: re2Dir,
    });
  }

  log.success('native modules should be setup for native ARM Mac development');
}
