/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PathConfigType } from '@kbn/utils';
import type { Logger } from '@kbn/logging';
import { mkdir } from './fs';

export async function createDataFolder({
  pathConfig,
  logger,
}: {
  pathConfig: PathConfigType;
  logger: Logger;
}): Promise<void> {
  const dataFolder = pathConfig.data;
  try {
    // Create the data directory (recursively, if the a parent dir doesn't exist).
    // If it already exists, does nothing.
    await mkdir(dataFolder, { recursive: true });
  } catch (e) {
    logger.error(`Error trying to create data folder at ${dataFolder}: ${e}`);
    throw e;
  }
}
