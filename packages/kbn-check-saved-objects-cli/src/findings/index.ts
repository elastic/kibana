/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { RULE_IDS } from './types';
export type {
  RuleId,
  FindingSeverity,
  SavedObjectsCheckFinding,
  SavedObjectsCheckReport,
  TypeChangeDetails,
} from './types';
export { SavedObjectsCheckError, isSavedObjectsCheckError } from './error';
export { FindingsCollector } from './collector';
