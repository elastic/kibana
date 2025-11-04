/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';

const REMOVED_TYPES_JSON_PATH = path.resolve(__dirname, '../../removed_types.json');

/**
 * Updates the removed_types.json file by adding new removed types
 */
export async function updateRemovedTypes(
  removedTypes: string[],
  log: ToolingLog
) {
  log.info(`Updating removed_types.json`);
  const currentRemovedTypes = await readRemovedTypesJson();
  const typesToAdd = removedTypes.filter(type => !currentRemovedTypes.includes(type));
  
  if (typesToAdd.length === 0) {
    log.info('removed_types.json already contains all specified types');
    return;
  }

  const allTypes = [...currentRemovedTypes, ...typesToAdd].sort();

  await writeRemovedTypesJson(allTypes);
}

/**
 * Reads the removed types from the JSON file
 */
async function readRemovedTypesJson(): Promise<string[]> {
  const fileContent = await fs.readFile(REMOVED_TYPES_JSON_PATH, 'utf-8');
  return JSON.parse(fileContent);
}

/**
 * Writes the removed types to the JSON file
 */
async function writeRemovedTypesJson(removedTypes: string[]): Promise<void> {
  const jsonContent = JSON.stringify(removedTypes, null, 2) + '\n';
  await fs.writeFile(REMOVED_TYPES_JSON_PATH, jsonContent, 'utf-8');
}
