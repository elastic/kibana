/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Evaluator } from '@kbn/evals';
import type { RoleGenerationOutput, RoleGenerationInput } from '../types';

/**
 * CODE evaluator — deterministic shape and value checks.
 * Fast, free, always runs first.
 */
export const createRoleSchemaEvaluator = (): Evaluator<
  Example<RoleGenerationInput, RoleGenerationOutput, RoleGenerationMetadata>,
  RoleGenerationOutput
> => ({
  name: 'RoleSchema',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    if (output?.error) {
      return { score: 0, label: 'task_error', explanation: output.error.slice(0, 500) };
    }

    if (!output?.roleName) {
      return { score: 0, label: 'missing_role_name' };
    }

    const validAccess = new Set(['all', 'read']);

    for (const k of output.kibana ?? []) {
      if (!k.id || typeof k.id !== 'string') {
        return { score: 0, label: 'invalid_kibana_feature_id', explanation: JSON.stringify(k) };
      }
      if (!validAccess.has(k.access)) {
        return { score: 0, label: 'invalid_kibana_access', explanation: JSON.stringify(k) };
      }
      if (!k.space || typeof k.space !== 'string') {
        return { score: 0, label: 'invalid_kibana_space', explanation: JSON.stringify(k) };
      }
    }

    for (const es of output.elasticsearch ?? []) {
      if (!es.index || typeof es.index !== 'string') {
        return { score: 0, label: 'invalid_es_index', explanation: JSON.stringify(es) };
      }
      if (!validAccess.has(es.access)) {
        return { score: 0, label: 'invalid_es_access', explanation: JSON.stringify(es) };
      }
    }

    if (!['all', 'read', 'none'].includes(output.accessToSystemIndices)) {
      return {
        score: 0,
        label: 'invalid_system_indices',
        explanation: output.accessToSystemIndices,
      };
    }

    return { score: 1, label: 'ok' };
  },
});
