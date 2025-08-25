/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import Fs from 'fs';
import Path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';

export async function writeRetriesFile({
  dataDir,
  retries,
  log,
}: {
  dataDir: string;
  retries: number;
  log: ToolingLog;
}): Promise<string> {
  const contents = `jest.retryTimes(${retries});`;

  const setupFilePath = Path.join(dataDir, `setup_retries_${retries}.js`);

  log.debug(`Writing retries file to ${setupFilePath}`);

  await Fs.promises.writeFile(setupFilePath, contents, 'utf8');

  return setupFilePath;
}
