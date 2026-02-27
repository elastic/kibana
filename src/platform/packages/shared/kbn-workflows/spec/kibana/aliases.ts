/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface OperationTypeOverride {
  /** The cleaner type name to use instead of the auto-generated operation ID */
  type: string;
  /** Whether to create a backward-compatible alias schema for the old type name */
  backward: boolean;
}

/**
 * Operation ID overrides - maps OpenAPI operation IDs to cleaner type names.
 * This is the single source of truth for all type renaming.
 *
 * - `backward: true` entries also generate alias schemas in the workflow Zod/JSON schema
 *   so that workflows using the old type name continue to validate.
 * - `backward: false` entries only rename the type during code generation without
 *   adding extra schemas (use for new connectors with no existing users).
 */
export const OPERATION_TYPE_OVERRIDES: Record<string, OperationTypeOverride> = {
  // Cases - have existing users, need backward-compatible aliases
  createCaseDefaultSpace: { type: 'createCase', backward: true },
  getCaseDefaultSpace: { type: 'getCase', backward: true },
  updateCaseDefaultSpace: { type: 'updateCase', backward: true },
  addCaseCommentDefaultSpace: { type: 'addCaseComment', backward: true },
  // Streams - new, no existing users, no aliases needed
  'get-streams': { type: 'streams.list', backward: false },
  'get-streams-name': { type: 'streams.get', backward: false },
  'get-streams-name-significant-events': {
    type: 'streams.getSignificantEvents',
    backward: false,
  },
};

/**
 * Derives full Kibana type aliases from operation overrides that have backward compatibility enabled.
 * Maps 'kibana.{oldOperationId}' to 'kibana.{newTypeName}'
 */
export const KIBANA_TYPE_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(OPERATION_TYPE_OVERRIDES)
    .filter(([, v]) => v.backward)
    .map(([oldOp, v]) => [`kibana.${oldOp}`, `kibana.${v.type}`])
);
