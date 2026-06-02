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
  EXISTING_TYPE_REMOVED_MAPPED_PROPERTIES: 'existing-type/removed-mapped-properties',
  EXISTING_TYPE_VIRTUAL_VERSION_DOWNGRADE: 'existing-type/virtual-version-downgrade',
  EXISTING_TYPE_SCHEMA_BREAKING_CHANGES: 'existing-type/schema-breaking-changes',
  EXISTING_TYPE_SCHEMA_UNDIFFABLE: 'existing-type/schema-undiffable-legacy-hash',
  EXISTING_TYPE_NEW_MAPPINGS_NOT_IN_MODEL_VERSION:
    'existing-type/new-mappings-not-in-model-version',
  EXISTING_TYPE_KEYWORD_MISSING_IGNORE_ABOVE: 'existing-type/keyword-missing-ignore-above',
  EXISTING_TYPE_INVALID_NAME_TITLE_FIELD_TYPE: 'existing-type/invalid-name-title-field-type',
  // new types
  NEW_TYPE_LEGACY_MIGRATIONS: 'new-type/legacy-migrations',
  NEW_TYPE_MISSING_INITIAL_MODEL_VERSION: 'new-type/missing-initial-model-version',
  NEW_TYPE_KEYWORD_MISSING_IGNORE_ABOVE: 'new-type/keyword-missing-ignore-above',
  NEW_TYPE_INVALID_NAME_TITLE_FIELD_TYPE: 'new-type/invalid-name-title-field-type',
  // model versions (shared)
  INITIAL_MODEL_VERSION_HAS_CHANGES: 'model-version/initial-must-be-schema-only',
  MODEL_VERSION_NUMBERS_INVALID: 'model-version/numbers-must-be-consecutive',
  MODEL_VERSION_MISSING_SCHEMAS: 'model-version/missing-schemas',
  MODEL_VERSION_MISSING_FORWARD_COMPATIBILITY: 'model-version/missing-forward-compatibility',
  MODEL_VERSION_MISSING_CREATE_SCHEMA: 'model-version/missing-create-schema',
  MODEL_VERSION_MAPPINGS_NOT_IN_SCHEMA: 'model-version/mappings-not-in-schema',
  MODEL_VERSION_MAPPING_INDEX_FALSE: 'model-version/mapping-index-false',
  MODEL_VERSION_MAPPING_ENABLED_FALSE: 'model-version/mapping-enabled-false',
  MODEL_VERSION_FIXTURE_MISSING: 'model-version/fixture-missing',
  MODEL_VERSION_FIXTURE_INVALID: 'model-version/fixture-invalid',
  // documents
  DOCUMENTS_FIXTURE_MISMATCH: 'documents/fixture-mismatch',
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
  /**
   * Path fragment appended to the Saved Objects docs base URL.
   * MUST start with `#` (anchor on the same page, e.g. `#defining-model-versions`)
   * or `/` (relative path, e.g. `/troubleshooting#existing-type-mutated-migrations`).
   * A value without a leading `#` or `/` will produce a malformed URL.
   */
  docsAnchor?: string;
  /** GCS URL of the regular (merge-base) baseline snapshot that triggered this finding. */
  baselineUrl?: string;
  /** GCS URL of the serverless baseline snapshot that triggered this finding. */
  serverlessBaselineUrl?: string;
}

/** Per-type change details included in the report for updated SO types. */
export interface TypeChangeDetails {
  /** Model versions added since the baseline, formatted as `10.x.0`. */
  newModelVersions: string[];
  /** Existing model versions modified since the baseline, formatted as `10.x.0`. */
  modifiedModelVersions: string[];
}

export interface SavedObjectsCheckReport {
  status: 'pass' | 'fail';
  baseline?: string;
  serverlessBaseline?: string;
  newTypes: string[];
  updatedTypes: string[];
  removedTypes: string[];
  findings: SavedObjectsCheckFinding[];
  /**
   * Per-type model version change details for updated SO types.
   * Only present when both `from` and `to` snapshots are available.
   */
  typeChanges?: Record<string, TypeChangeDetails>;
  /**
   * True when the check ran against synthetic test data (either via `--test`
   * or the automatic fallback when no real SO types changed). In this mode the
   * `newTypes` / `updatedTypes` / `removedTypes` lists reflect test fixtures,
   * not actual contributor changes, so no PR comment should be posted.
   */
  testMode?: boolean;
}
