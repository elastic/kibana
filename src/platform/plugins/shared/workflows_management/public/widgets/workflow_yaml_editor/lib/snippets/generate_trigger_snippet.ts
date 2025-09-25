/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TriggerType } from '@kbn/workflows';
import type { ToStringOptions } from 'yaml';
import { stringify } from 'yaml';

interface GenerateTriggerSnippetOptions {
  full?: boolean;
  monacoSuggestionFormat?: boolean;
  withTriggersSection?: boolean;
}

/**
 * Generates a YAML snippet for a workflow trigger based on the specified type.
 * @param triggerType - The type of trigger ('alert', 'scheduled', 'manual', etc.)
 * @param options - Configuration options for snippet generation
 * @param options.full - Whether to include the full YAML structure with '- type: ' prefix
 * @param options.monacoSuggestionFormat - Whether to format the snippet for Monaco editor suggestions with placeholders
 * @param options.withTriggersSection - Whether to include the "triggers:" section
 * @returns The formatted YAML trigger snippet as a string
 */
export function generateTriggerSnippet(
  triggerType: TriggerType,
  { full, monacoSuggestionFormat, withTriggersSection }: GenerateTriggerSnippetOptions = {}
): string {
  const stringifyOptions: ToStringOptions = { indent: 2 };
  let parameters: Record<string, any>;

  switch (triggerType) {
    case 'alert':
      parameters = {};
      break;

    case 'scheduled':
      if (!monacoSuggestionFormat) {
        parameters = {
          with: { every: '5', unit: 'minute' },
        };
      } else {
        parameters = {
          with: { every: '${1:5}', unit: '${2|second,minute,hour,day,week,month,year|}' },
        };
      }
      break;

    case 'manual':
      parameters = {};
      break;

    default:
      parameters = {};
      break;
  }

  if (full) {
    // if the full snippet is requested, return the whole trigger node as a sequence item
    // - type: ${triggerType}
    //   ...parameters
    const trigger = [
      {
        type: triggerType,
        ...parameters,
      },
    ];
    if (withTriggersSection) {
      return stringify({ triggers: trigger }, stringifyOptions);
    }
    return stringify(trigger, stringifyOptions);
  }

  // otherwise, the "type:" is already present, so we just return the type value and parameters
  // (type:)${triggerType}
  // ...parameters
  // stringify always adds a newline, so we need to remove it
  return `${triggerType}\n${stringify(parameters, stringifyOptions)}`;
}
