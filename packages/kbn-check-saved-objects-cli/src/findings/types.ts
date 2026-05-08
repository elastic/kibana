/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const RULE_IDS = {
  // existing types
  EXISTING_TYPE_MUTATED_MIGRATIONS: 'existing-type/mutated-migrations',
  EXISTING_TYPE_DELETED_MODEL_VERSIONS: 'existing-type/deleted-model-versions',
  EXISTING_TYPE_TOO_MANY_NEW_MODEL_VERSIONS: 'existing-type/too-many-new-model-versions',
  EXISTING_TYPE_MAPPINGS_WITHOUT_NEW_MODEL_VERSION:
    'existing-type/mappings-changed-without-new-model-version',
  EXISTING_TYPE_MUTATED_MODEL_VERSION: 'existing-type/mutated-existing-model-version',
  // new types
  NEW_TYPE_LEGACY_MIGRATIONS: 'new-type/legacy-migrations',
  NEW_TYPE_MISSING_INITIAL_MODEL_VERSION: 'new-type/missing-initial-model-version',
  // model versions (shared)
  INITIAL_MODEL_VERSION_HAS_CHANGES: 'model-version/initial-must-be-schema-only',
  MODEL_VERSION_NUMBERS_INVALID: 'model-version/numbers-must-be-consecutive',
  MODEL_VERSION_MISSING_SCHEMAS: 'model-version/missing-schemas',
  MODEL_VERSION_MISSING_FORWARD_COMPATIBILITY: 'model-version/missing-forward-compatibility',
  MODEL_VERSION_MISSING_CREATE_SCHEMA: 'model-version/missing-create-schema',
  // removed types
  REMOVED_TYPE_NAME_REUSED: 'removed-type/name-reused',
  REMOVED_TYPE_NEEDS_UPDATE: 'removed-type/registry-needs-update',
  // generic fallback for validators that haven't been migrated yet
  GENERIC: 'generic',
} as const;

export type RuleId = (typeof RULE_IDS)[keyof typeof RULE_IDS];

export type FindingSeverity = 'error' | 'warning';

export interface SavedObjectsCheckFinding {
  ruleId: RuleId;
  severity: FindingSeverity;
  typeName?: string;
  message: string;
  fixHint?: string;
  /** Anchor fragment under the Saved Objects docs page (e.g. `#defining-model-versions`). */
  docsAnchor?: string;
}

export interface SavedObjectsCheckReport {
  status: 'pass' | 'fail';
  baseline?: string;
  serverlessBaseline?: string;
  newTypes: string[];
  updatedTypes: string[];
  removedTypes: string[];
  findings: SavedObjectsCheckFinding[];
}

export class SavedObjectsCheckError extends Error {
  public readonly finding: SavedObjectsCheckFinding;

  constructor(finding: SavedObjectsCheckFinding) {
    super(finding.message);
    this.name = 'SavedObjectsCheckError';
    this.finding = finding;
  }
}

export function isSavedObjectsCheckError(err: unknown): err is SavedObjectsCheckError {
  return err instanceof Error && err.name === 'SavedObjectsCheckError' && 'finding' in err;
}
