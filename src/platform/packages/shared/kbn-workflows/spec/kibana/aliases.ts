/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Operation ID overrides - maps OpenAPI operation IDs to cleaner type names.
 * This is the single source of truth for all type aliasing.
 */
export const OPERATION_TYPE_OVERRIDES: Record<string, string> = {
  createCaseDefaultSpace: 'createCase',
  getCaseDefaultSpace: 'getCase',
  updateCaseDefaultSpace: 'updateCase',
  addCaseCommentDefaultSpace: 'addCaseComment',
};

/**
 * Derives full Kibana type aliases from operation overrides.
 * Maps 'kibana.{oldOperationId}' to 'kibana.{newTypeName}'
 */
export const KIBANA_TYPE_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(OPERATION_TYPE_OVERRIDES).map(([oldOp, newType]) => [
    `kibana.${oldOp}`,
    `kibana.${newType}`,
  ])
);
