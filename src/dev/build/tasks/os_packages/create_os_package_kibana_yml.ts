/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { dump } from 'js-yaml';
import { Build, Config, mkdirp } from '../../lib';

export async function createOSPackageKibanaYML(config: Config, build: Build) {
  const configReadPath = config.resolveFromRepo('config', 'kibana.yml');
  const configWriteDir = config.resolveFromRepo('build', 'os_packages', 'config');
  const configWritePath = resolve(configWriteDir, 'kibana.yml');

  await mkdirp(configWriteDir);

  let kibanaYML = readFileSync(configReadPath, { encoding: 'utf8' });

  [
    [/#pid.file:.*/g, 'pid.file: /run/kibana/kibana.pid'],
    [
      /#logging.appenders.default:.*kibana\.log\n/gs,
      dump({
        logging: {
          appenders: {
            file: {
              type: 'file',
              fileName: '/var/log/kibana/kibana.log',
              layout: {
                type: 'json',
              },
            },
          },
          root: {
            appenders: ['default', 'file'],
          },
        },
      }),
    ],
  ].forEach((options) => {
    const [regex, setting] = options;
    const diff = kibanaYML;
    const match = kibanaYML.search(regex) >= 0;
    if (match) {
      if (typeof setting === 'string') {
        kibanaYML = kibanaYML.replace(regex, setting);
      }
    }

    if (!diff.localeCompare(kibanaYML)) {
      throw new Error(
        `OS package configuration unmodified.  Verify match for ${regex} is available`
      );
    }
  });

  try {
    writeFileSync(configWritePath, kibanaYML, { flag: 'wx' });
  } catch (err) {
    if (err.code === 'EEXIST') {
      return;
    }
    throw err;
  }
}
