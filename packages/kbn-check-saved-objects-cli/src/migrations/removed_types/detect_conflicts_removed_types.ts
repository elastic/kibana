/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationSnapshot } from '../../types';
import { RULE_IDS, SavedObjectsCheckError } from '../../findings';

/**
 * Detects new types in 'to' that conflict with previously removed types
 */
export async function detectConflictsWithRemovedTypes(
  to: MigrationSnapshot,
  currentRemovedTypes: string[]
) {
  const toTypes = Object.keys(to.typeDefinitions);

  const conflictingTypes: string[] = [];

  for (const type of toTypes) {
    if (currentRemovedTypes.includes(type)) {
      conflictingTypes.push(type);
    }
  }

  if (conflictingTypes.length === 0) {
    return;
  }

  const findings = conflictingTypes.map((type) => ({
    ruleId: RULE_IDS.REMOVED_TYPE_NAME_REUSED,
    severity: 'error' as const,
    typeName: type,
    message: `Cannot re-register previously removed type '${type}'. Please use a different name.`,
    fixHint: `Pick a different name for the SO type. Once removed, a name cannot be reused.`,
    docsAnchor: '#defining-model-versions',
  }));

  throw new SavedObjectsCheckError(findings);
}
