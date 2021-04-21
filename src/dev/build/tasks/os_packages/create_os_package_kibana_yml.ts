/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { Build, Config, mkdirp } from '../../lib';

export async function createOSPackageKibanaYML(config: Config, build: Build) {
  const configReadPath = config.resolveFromRepo('config', 'kibana.yml');
  const configWriteDir = config.resolveFromRepo('build', 'os_packages', 'config');
  const configWritePath = resolve(configWriteDir, 'kibana.yml');

  await mkdirp(configWriteDir);

  const kibanaYML = readFileSync(configReadPath, {
    encoding: 'utf-8',
  })
    .replace(/#pid.file:.*/g, 'pid.file: /run/kibana/kibana.pid')
    .replace(/#logging.dest:.*/g, 'logging.dest: /var/log/kibana/kibana.log');

  try {
    writeFileSync(configWritePath, kibanaYML, { flag: 'wx' });
  } catch (err) {
    if (err.code === 'EEXIST') {
      return;
    }
    throw err;
  }
}
