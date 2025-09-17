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
export function generateTriggerSnippet(
  triggerType: string,
  shouldBeQuoted: boolean,
  full: boolean = false,
  indentLevel: number = 0
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
      return `${prepend}${quotedType}\n  with:\n    every: "\${1:5}"\n    unit: "\${2|second,minute,hour,day,week,month,year|}"`;

    case 'manual':
      return `${prepend}${quotedType}`;

    default:
      return `${prepend}${quotedType}`;
  }
}
