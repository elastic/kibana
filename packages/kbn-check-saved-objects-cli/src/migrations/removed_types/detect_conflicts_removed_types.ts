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
 * Detects new types in 'to' that conflict with previously removed types.
 *
 * WIP types are exempt from this check: a type that was registered, removed,
 * and is now being re-introduced as a WIP type is a legitimate use case (e.g.
 * an existing type converted into a WIP type), so it must not be treated as an
 * illegal reuse of a removed type name.
 */
export async function detectConflictsWithRemovedTypes(
  to: MigrationSnapshot,
  currentRemovedTypes: string[],
  wipTypes: string[] = []
) {
  const toTypes = Object.keys(to.typeDefinitions);
  const removedTypes = new Set(currentRemovedTypes);
  const wipTypeSet = new Set(wipTypes);

  const conflictingTypes = toTypes.filter(
    (type) => removedTypes.has(type) && !wipTypeSet.has(type)
  );

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
