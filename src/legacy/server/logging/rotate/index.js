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

import { isMaster, isWorker } from 'cluster';
import { LogRotator } from './log_rotator';

let logRotator = null;

export async function setupLoggingRotate(server, config) {
  // If log rotate is not enabled we skip
  if (!config.get('logging.rotate.enabled')) {
    return;
  }

  // We don't want to run logging rotate server if
  // we are not logging to a file
  if (config.get('logging.rotate.enabled') && config.get('logging.dest') === 'stdout') {
    server.logWithMetadata(
      ['warning', 'logging:rotate'],
      'Logging rotate is enabled but logging.dest is configured for stdout. The logging rotate will take no action.'
    );
    return;
  }

  // We just want to start the logging rotate service once
  // and we choose to use the master (prod) or the worker server (dev)
  if (!isMaster && isWorker && process.env.kbnWorkerType !== 'server') {
    return;
  }

  // Enable Logging Rotate Service
  // We need the master process and it can
  // try to setupLoggingRotate more than once,
  // so we'll need to assure it only loads once.
  if (!logRotator) {
    logRotator = new LogRotator(config);
    await logRotator.start();
  }

  return logRotator;
}
