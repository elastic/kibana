/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import type { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';

export const CURRENT_MAPPINGS_FILE = path.join(__dirname, 'current_mappings.json');
export function writeToMappingsFile(mappings: SavedObjectsTypeMappingDefinitions) {
  fs.writeFileSync(CURRENT_MAPPINGS_FILE, JSON.stringify(mappings, null, 2));
}

export const log = {
  // eslint-disable-next-line no-console
  write: (...msg: string[]) => console.log(...msg),
  info: (...msg: string[]) => log.write(chalk.cyan(`[info]`), ...msg),
  fatal: (...msg: string[]) => log.write(chalk.red(`[fatal]`), ...msg),
  success: (...msg: string[]) => log.write(chalk.green(`[success]`), ...msg),
};

export function exit(code: number) {
  process.nextTick(() => {
    process.exit(code);
  });
}
