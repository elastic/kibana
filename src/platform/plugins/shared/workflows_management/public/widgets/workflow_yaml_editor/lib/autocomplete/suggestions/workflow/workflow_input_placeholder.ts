/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LegacyWorkflowInput } from '@kbn/workflows';
// WorkflowInputChoiceSchema is needed as a value for typeof, not just as a type
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { WorkflowInputChoiceSchema } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';

type WorkflowInputChoice = z.infer<typeof WorkflowInputChoiceSchema>;

/**
 * Returns the placeholder value for a workflow input based on its type and default.
 * Single source of truth for type→value mapping; callers wrap for snippet or insert text.
 */
export function getInputPlaceholderValue(input: LegacyWorkflowInput): string {
  if (input.default !== undefined) {
    return JSON.stringify(input.default);
  }
  switch (input.type) {
    case 'string':
      return '""';
    case 'number':
      return '0';
    case 'boolean':
      return 'false';
    case 'choice': {
      const choiceInput = input as WorkflowInputChoice;
      if (choiceInput.options && choiceInput.options.length > 0) {
        return JSON.stringify(choiceInput.options[0]);
      }
      return '""';
    }
    case 'array':
      return '[]';
    default:
      return '""';
  }
}
