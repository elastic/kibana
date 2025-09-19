/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generate a snippet template for trigger types with appropriate parameters
 */
// TODO: better interface for this function
export function generateTriggerSnippet(
  triggerType: string,
  shouldBeQuoted: boolean, // FIX: why we might need quoted type?
  full: boolean = false,
  indentLevel: number = 0,
  monacoSuggestionFormat: boolean = true
): string {
  const quotedType = shouldBeQuoted ? `"${triggerType}"` : triggerType;
  let prepend = '';

  if (full) {
    prepend = '- type: ';
  }

  // Generate appropriate snippets based on trigger type
  switch (triggerType) {
    case 'alert':
      return `${prepend}${quotedType}`;

    case 'scheduled':
      if (!monacoSuggestionFormat) {
        return `${prepend}${quotedType}\n  with:\n    every: "5"\n    unit: minute`;
      }
      return `${prepend}${quotedType}\n  with:\n    every: "\${1:5}"\n    unit: "\${2|second,minute,hour,day,week,month,year|}"`;

    case 'manual':
      return `${prepend}${quotedType}`;

    default:
      return `${prepend}${quotedType}`;
  }
}
