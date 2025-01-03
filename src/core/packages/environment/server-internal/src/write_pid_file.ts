/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { unlinkSync as unlink } from 'fs';
import once from 'lodash/once';
import type { Logger } from '@kbn/logging';
import { writeFile, exists } from './fs';
import { PidConfigType } from './pid_config';

export const writePidFile = async ({
  pidConfig,
  logger,
}: {
  pidConfig: PidConfigType;
  logger: Logger;
}) => {
  const path = pidConfig.file;
  if (!path) {
    return;
  }

  const pid = String(process.pid);

  if (await exists(path)) {
    const message = `pid file already exists at ${path}`;
    if (pidConfig.exclusive) {
      throw new Error(message);
    } else {
      logger.warn(message, {
        process: {
          pid: process.pid,
          path,
        },
      });
    }
  }

  await writeFile(path, pid);

  logger.debug(`wrote pid file to ${path}`, {
    process: {
      pid: process.pid,
      path,
    },
  });

  const clean = once(() => {
    unlink(path);
  });

  process.once('exit', clean); // for "natural" exits
  process.once('SIGINT', () => {
    // for Ctrl-C exits
    clean();
    // resend SIGINT
    process.kill(process.pid, 'SIGINT');
  });
};
