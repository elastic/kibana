/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TriggerType } from '@kbn/workflows';

interface GenerateTriggerSnippetOptions {
  full?: boolean;
  monacoSuggestionFormat?: boolean;
}

/**
 * Generates a YAML snippet for a workflow trigger based on the specified type.
 * @param triggerType - The type of trigger ('alert', 'scheduled', 'manual', etc.)
 * @param options - Configuration options for snippet generation
 * @param options.full - Whether to include the full YAML structure with '- type: ' prefix
 * @param options.monacoSuggestionFormat - Whether to format the snippet for Monaco editor suggestions with placeholders
 * @returns The formatted YAML trigger snippet as a string
 */
export function generateTriggerSnippet(
  triggerType: TriggerType,
  { full, monacoSuggestionFormat }: GenerateTriggerSnippetOptions = {}
): string {
  let prepend = '';

  if (full) {
    prepend = '- type: ';
  }

  switch (triggerType) {
    case 'alert':
      return `${prepend}${triggerType}`;

    case 'scheduled':
      if (!monacoSuggestionFormat) {
        return `${prepend}${triggerType}\n  with:\n    every: "5"\n    unit: minute`;
      }
      return `${prepend}${triggerType}\n  with:\n    every: "\${1:5}"\n    unit: "\${2|second,minute,hour,day,week,month,year|}"`;

    case 'manual':
      return `${prepend}${triggerType}`;

    default:
      return `${prepend}${triggerType}`;
  }
}
