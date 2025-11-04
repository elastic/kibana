/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { MigrationSnapshot } from '../types';
import { updateRemovedTypes } from './update_removed_types';

/**
 * Detects types that were removed between baseline and current snapshot,
 * then automatically updates the removed_types.json file to track the removal.
 * TODO: pass in the fix flag eventually and check if fix flag is set to true
 * TODO: checks for new types that have the same name as an existing removed type
 */
export async function handleRemovedTypes({
  log,
  from,
  current,
}: {
  log: ToolingLog;
  from: MigrationSnapshot;
  current: MigrationSnapshot;
}) {
  const removedTypes = detectRemovedTypes(from, current);
  
  if (removedTypes.length === 0) {
    log.info('No removed types detected');
    return;
  }

  log.info(`Detected ${removedTypes.length} removed type(s): ${removedTypes.join(', ')}`);
  
  try {
    await updateRemovedTypes(removedTypes, log);
    log.info(`✅ Successfully handled ${removedTypes.length} removed type(s)`);
  } catch (error) {
    log.error(`❌ Failed to handle removed types: ${error.message}`);
    throw error;
  };
}

/**
 * Compares two snapshots and identifies types that exist in 'from' but not in 'current'
 */
function detectRemovedTypes(from: MigrationSnapshot, current: MigrationSnapshot): string[] {
  const fromTypes = Object.keys(from.typeDefinitions);
  const currentTypes = Object.keys(current.typeDefinitions);
  
  const removedTypes: string[] = [];
  
  for (const typeName of fromTypes) {
    if (!currentTypes.includes(typeName)) {
      removedTypes.push(typeName);
    }
  }
  
  return removedTypes.sort();
}
