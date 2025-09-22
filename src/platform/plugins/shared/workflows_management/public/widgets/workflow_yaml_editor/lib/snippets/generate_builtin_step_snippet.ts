/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuiltInStepType } from '@kbn/workflows';

interface GenerateBuiltInStepSnippetOptions {
  full?: boolean;
}

/**
 * Generates a YAML snippet for a built-in workflow step based on the specified type.
 * @param stepType - The type of built-in step ('foreach', 'if', 'parallel', 'merge', 'http', 'wait', etc.)
 * @param options - Configuration options for snippet generation
 * @param options.full - Whether to include the full YAML structure with step name and type prefix
 * @returns The formatted YAML step snippet with appropriate parameters and structure
 */
export function generateBuiltInStepSnippet(
  stepType: BuiltInStepType,
  { full }: GenerateBuiltInStepSnippetOptions = {}
): string {
  let prepend = '';
  if (full) {
    prepend = `- name: ${stepType}_step\n  type: `;
  }

  let parameters = '';
  switch (stepType) {
    case 'foreach':
      parameters = `\nforeach: "{{ context.items }}"\nsteps:\n  - name: "process-item"\n    type: # Add step type here`;
      break;
    case 'if':
      parameters = `\ncondition: "{{ context.condition }}"\nsteps:\n  - name: "then-step"\n    type: # Add step type here\nelse:\n  - name: "else-step"\n    type: # Add step type here`;
      break;
    case 'parallel':
      parameters = `\nbranches:\n  - name: "branch-1"\n    steps:\n      - name: "step-1"\n        type: # Add step type here\n  - name: "branch-2"\n    steps:\n      - name: "step-2"\n        type: # Add step type here`;
      break;
    case 'merge':
      parameters = `\nsources:\n  - "branch-1"\n  - "branch-2"\nsteps:\n  - name: "merge-step"\n    type: # Add step type here`;
      break;
    case 'http':
      parameters = `\nwith:\n  url: "https://api.example.com"\n  method: "GET"`;
      break;
    case 'wait':
      parameters = `\nwith:\n  duration: "5s"`;
      break;
    default:
      parameters = `\nwith:\n  # Add parameters here`;
  }

  return `${prepend}${stepType}${
    full
      ? // if full, indent the parameters
        parameters
          .split('\n')
          .map((line) => `  ${line}`)
          .join('\n')
      : parameters
  }`;
}
