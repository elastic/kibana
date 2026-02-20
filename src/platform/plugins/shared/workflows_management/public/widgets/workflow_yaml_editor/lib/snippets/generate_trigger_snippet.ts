/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
  triggerType: string,
  { full, monacoSuggestionFormat, withTriggersSection }: GenerateTriggerSnippetOptions = {}
): string {
  const stringifyOptions: ToStringOptions = { indent: 2 };
  let parameters: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  switch (triggerType) {
    case 'alert':
      parameters = {};
      break;

    case 'scheduled':
      if (!monacoSuggestionFormat) {
        // Default to simple interval format
        parameters = {
          with: { every: '5m' },
        };
      } else {
        // Provide multiple scheduling options with placeholders
        parameters = {
          with: {
            // Simple interval option
            every: '${1|5m,2h,1d,30s|}',
            // Alternative: RRule option
            // rrule:
            //   freq: '${2|DAILY,WEEKLY,MONTHLY|}',
            //   interval: '${3:1}',
            //   tzid: '${4:UTC}',
            //   byhour: '${5:[9]}',
            //   byminute: '${6:[0]}',
            //   byweekday: '${7:[MO,FR]}', // for weekly
            //   bymonthday: '${8:[1,15]}', // for monthly
          },
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

  return stringify([{ type: triggerType, ...parameters }], stringifyOptions)
    .replace('- type:', '')
    .trim();
}

/**
 * Generates RRule-specific trigger snippets for different scheduling patterns
 */
export function generateRRuleTriggerSnippet(
  pattern: 'daily' | 'weekly' | 'monthly' | 'custom',
  { full, monacoSuggestionFormat, withTriggersSection }: GenerateTriggerSnippetOptions = {}
): string {
  const stringifyOptions: ToStringOptions = { indent: 2 };
  let rruleConfig: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  switch (pattern) {
    case 'daily':
      if (monacoSuggestionFormat) {
        rruleConfig = {
          freq: '${1:DAILY}',
          interval: '${2:1}',
          tzid: '${3:UTC}',
          byhour: '${4:[9]}',
          byminute: '${5:[0]}',
        };
      } else {
        rruleConfig = {
          freq: 'DAILY',
          interval: 1,
          tzid: 'UTC',
          byhour: [9],
          byminute: [0],
        };
      }
      break;

    case 'weekly':
      if (monacoSuggestionFormat) {
        rruleConfig = {
          freq: '${1:WEEKLY}',
          interval: '${2:1}',
          tzid: '${3:America/New_York}',
          byweekday: '${4:[MO,TU,WE,TH,FR]}',
          byhour: '${5:[8,17]}',
          byminute: '${6:[0]}',
        };
      } else {
        rruleConfig = {
          freq: 'WEEKLY',
          interval: 1,
          tzid: 'America/New_York',
          byweekday: ['MO', 'TU', 'WE', 'TH', 'FR'],
          byhour: [8, 17],
          byminute: [0],
        };
      }
      break;

    case 'monthly':
      if (monacoSuggestionFormat) {
        rruleConfig = {
          freq: '${1:MONTHLY}',
          interval: '${2:1}',
          tzid: '${3:UTC}',
          byhour: '${4:[10]}',
          byminute: '${5:[30]}',
          bymonthday: '${6:[1,15]}',
        };
      } else {
        rruleConfig = {
          freq: 'MONTHLY',
          interval: 1,
          tzid: 'UTC',
          byhour: [10],
          byminute: [30],
          bymonthday: [1, 15],
        };
      }
      break;

    case 'custom':
      if (monacoSuggestionFormat) {
        rruleConfig = {
          freq: '${1:DAILY}',
          interval: '${2:1}',
          tzid: '${3:UTC}',
          dtstart: '${4:2024-01-15T09:00:00Z}',
          byhour: '${5:[9]}',
          byminute: '${6:[0]}',
          byweekday: '${7:[MO,TU,WE,TH,FR]}',
          bymonthday: '${8:[1,15]}',
        };
      } else {
        rruleConfig = {
          freq: 'DAILY',
          interval: 1,
          tzid: 'UTC',
          dtstart: '2024-01-15T09:00:00Z',
          byhour: [9],
          byminute: [0],
          byweekday: ['MO', 'TU', 'WE', 'TH', 'FR'],
          bymonthday: [1, 15],
        };
      }
      break;

    default:
      rruleConfig = {};
  }

  // Generate just the rrule configuration
  const rruleSnippet = stringify({ rrule: rruleConfig }, stringifyOptions);
  return rruleSnippet;
}
