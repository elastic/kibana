/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Pair, Scalar } from 'yaml';
import { isMap, isPair, isScalar, parseDocument, visit } from 'yaml';

import {
  isDynamicWorkflowReference,
  WORKFLOW_EXECUTE_TYPES,
  WORKFLOW_REFERENCE_KEY,
} from './workflow_import_constants';

/**
 * Rewrites `workflow-id` references inside `workflow.execute` and
 * `workflow.executeAsync` steps, replacing old IDs with new ones according
 * to the provided mapping. Preserves YAML formatting by mutating the
 * parsed Document in place and serialising it back.
 *
 * Only static string values are rewritten; dynamic/templated values
 * (containing `{{`) are left untouched.
 */
export const rewriteWorkflowReferences = (yaml: string, idMapping: Map<string, string>): string => {
  if (idMapping.size === 0) return yaml;

  const doc = parseDocument(yaml);
  let modified = false;

  visit(doc, {
    Map(_key, node) {
      if (!isMap(node) || !node.items) return;

      const typePair = node.items.find(
        (item): item is Pair<Scalar, Scalar> =>
          isPair(item) && isScalar(item.key) && item.key.value === 'type' && isScalar(item.value)
      );
      if (!typePair || !typePair.value || !WORKFLOW_EXECUTE_TYPES.has(String(typePair.value.value)))
        return;

      const withPair = node.items.find(
        (item): item is Pair<Scalar, unknown> =>
          isPair(item) && isScalar(item.key) && item.key.value === 'with'
      );
      if (!withPair || !isMap(withPair.value)) return;

      const workflowIdPair = withPair.value.items.find(
        (item): item is Pair<Scalar, Scalar> =>
          isPair(item) &&
          isScalar(item.key) &&
          item.key.value === WORKFLOW_REFERENCE_KEY &&
          isScalar(item.value)
      );
      if (!workflowIdPair || !workflowIdPair.value) return;

      const oldId = String(workflowIdPair.value.value);
      if (isDynamicWorkflowReference(oldId)) return;

      const newId = idMapping.get(oldId);
      if (newId) {
        workflowIdPair.value.value = newId;
        modified = true;
      }
    },
  });

  return modified ? doc.toString() : yaml;
};
