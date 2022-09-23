/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import { ToolingLog } from '@kbn/tooling-log';

export async function initLogsDir(log: ToolingLog, logsDir: string) {
  log.info(`Kibana/ES logs will be written to ${Path.relative(process.cwd(), logsDir)}/`);
  Fs.mkdirSync(logsDir, { recursive: true });
}
