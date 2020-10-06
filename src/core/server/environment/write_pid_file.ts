/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { unlinkSync as unlink } from 'fs';
import once from 'lodash/once';
import { Logger } from '../logging';
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
      logger.warn(message, { path, pid });
    }
  }

  await writeFile(path, pid);

  logger.debug(`wrote pid file to ${path}`, { path, pid });

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
