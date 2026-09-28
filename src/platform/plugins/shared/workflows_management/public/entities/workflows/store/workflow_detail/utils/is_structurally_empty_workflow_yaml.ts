/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';

/** True when YAML has no triggers and no steps (creation-state empty). */
export const isStructurallyEmptyWorkflowYaml = (yaml: string): boolean => {
  try {
    const doc = parseDocument(yaml);
    const root = doc.toJS() as {
      triggers?: unknown[];
      steps?: unknown[];
    } | null;
    if (!root || typeof root !== 'object') {
      return true;
    }
    const triggerCount = Array.isArray(root.triggers) ? root.triggers.length : 0;
    const stepCount = Array.isArray(root.steps) ? root.steps.length : 0;
    return triggerCount === 0 && stepCount === 0;
  } catch {
    return false;
  }
};
