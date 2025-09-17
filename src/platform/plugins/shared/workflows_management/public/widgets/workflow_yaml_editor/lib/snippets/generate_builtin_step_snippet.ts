/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generate a snippet template for built-in step types
 */
export function generateBuiltInStepSnippet(
  stepType: string,
  shouldBeQuoted: boolean,
  full: boolean = false,
  indentLevel: number = 0
): string {
  const quotedType = shouldBeQuoted ? `"${stepType}"` : stepType;
  let prepend = '';
  if (full) {
    prepend = `- name: ${stepType}_step\n  type: `;
  }

  // Generate appropriate snippets based on step type
  switch (stepType) {
    case 'foreach':
      return `${prepend}${quotedType}\nforeach: "{{ context.items }}"\nsteps:\n  - name: "process-item"\n    type: # Add step type here`;

    case 'if':
      return `${prepend}${quotedType}\ncondition: "{{ context.condition }}"\nsteps:\n  - name: "then-step"\n    type: # Add step type here\nelse:\n  - name: "else-step"\n    type: # Add step type here`;

    case 'parallel':
      return `${prepend}${quotedType}\nbranches:\n  - name: "branch-1"\n    steps:\n      - name: "step-1"\n        type: # Add step type here\n  - name: "branch-2"\n    steps:\n      - name: "step-2"\n        type: # Add step type here`;

    case 'merge':
      return `${prepend}${quotedType}\nsources:\n  - "branch-1"\n  - "branch-2"\nsteps:\n  - name: "merge-step"\n    type: # Add step type here`;

    case 'http':
      return `${prepend}${quotedType}\nwith:\n  url: "https://api.example.com"\n  method: "GET"`;

    case 'wait':
      return `${prepend}${quotedType}\nwith:\n  duration: "5s"`;

    default:
      return `${prepend}${quotedType}\nwith:\n  # Add parameters here`;
  }
}
