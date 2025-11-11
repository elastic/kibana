/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import type { MigrationSnapshot } from '../types';
import { fileToJson, jsonToFile } from '../util/json';

const REMOVED_TYPES_JSON_PATH = path.resolve(__dirname, '../../removed_types.json');

/**
 * Detects types that were removed between base branch and current branch,
 * then automatically updates the removed_types.json file to track the removal.
 * Also checks for new types that have the same name as an existing removed type.
 */
export async function handleRemovedTypes({
  log,
  from,
  to,
  fix,
}: {
  log: ToolingLog;
  from: MigrationSnapshot;
  to: MigrationSnapshot;
  fix?: boolean;
}) {
  log.info(`Checking for removed types between base branch and current branch`);

  const currentRemovedTypes = (await fileToJson(REMOVED_TYPES_JSON_PATH)) as string[];

  const conflictingTypes = await detectConflictsWithRemovedTypes(to, currentRemovedTypes);
  if (conflictingTypes.length > 0) {
    throw new Error(
      `❌ Cannot re-register previously removed type(s): ${conflictingTypes.join(
        ', '
      )}. Please use a different name.`
    );
  }

  const removedTypes = detectRemovedTypes(from, to, currentRemovedTypes);
  if (removedTypes.length === 0) {
    log.info('No removed types detected');
    return;
  }

  log.info(`Detected ${removedTypes.length} removed type(s): ${removedTypes.join(', ')}`);

  if (!fix) {
    throw new Error(
      `❌ Removed types detected, but fix flag was not provided. Please run with --fix to update removed_types.json.`
    );
  }

  log.info(`Updating removed_types.json`);
  await updateRemovedTypes(removedTypes, currentRemovedTypes);
  log.info(`✅ Successfully handled ${removedTypes.length} removed type(s)`);
}

/**
 * Detects new types in 'to' that conflict with previously removed types
 */
async function detectConflictsWithRemovedTypes(
  to: MigrationSnapshot,
  currentRemovedTypes: string[]
): Promise<string[]> {
  const toTypes = Object.keys(to.typeDefinitions);

  const conflictingTypes: string[] = [];

  for (const type of toTypes) {
    if (currentRemovedTypes.includes(type)) {
      conflictingTypes.push(type);
    }
  }

  return conflictingTypes.sort();
}

/**
 * Compares two snapshots and identifies types that exist in 'from' but not in 'to' and not already in removed_types.json
 */
function detectRemovedTypes(
  from: MigrationSnapshot,
  to: MigrationSnapshot,
  currentRemovedTypes: string[]
): string[] {
  const fromTypes = Object.keys(from.typeDefinitions);
  const toTypes = Object.keys(to.typeDefinitions);

  const removedTypes: string[] = [];

  for (const type of fromTypes) {
    if (!toTypes.includes(type) && !currentRemovedTypes.includes(type)) {
      removedTypes.push(type);
    }
  }

  return removedTypes.sort();
}

/**
 * Updates the removed_types.json file by adding new removed types
 */
async function updateRemovedTypes(removedTypes: string[], currentRemovedTypes: string[]) {
  const allTypes = [...currentRemovedTypes, ...removedTypes].sort();
  await jsonToFile(REMOVED_TYPES_JSON_PATH, allTypes);
}
