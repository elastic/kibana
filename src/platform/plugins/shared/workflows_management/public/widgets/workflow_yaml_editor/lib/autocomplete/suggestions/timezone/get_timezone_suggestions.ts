/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';
import { monaco } from '@kbn/monaco';

const TIMEZONE_NAMES_SORTED = moment.tz.names().sort();

/**
 * Get timezone suggestions for tzid field
 */
export function getTimezoneSuggestions(
  range: monaco.IRange,
  prefix: string = ''
): monaco.languages.CompletionItem[] {
  const suggestions: monaco.languages.CompletionItem[] = [];

  const filteredTimezones = prefix
    ? TIMEZONE_NAMES_SORTED.filter((tz) => tz.toLowerCase().includes(prefix.toLowerCase()))
    : TIMEZONE_NAMES_SORTED;

  // Limit to 25 suggestions for performance
  const limitedTimezones = filteredTimezones.slice(0, 25);

  limitedTimezones.forEach((timezone) => {
    const offset = moment.tz(timezone).format('Z');
    const offsetText = moment.tz(timezone).format('z');

    suggestions.push({
      label: timezone,
      kind: monaco.languages.CompletionItemKind.EnumMember,
      insertText: timezone,
      range,
      documentation: {
        value: `**${timezone}**\n\nOffset: ${offset} (${offsetText})\n\nTimezone identifier for RRule scheduling.`,
      },
      filterText: timezone,
      sortText: timezone.startsWith('UTC') ? `!${timezone}` : timezone, // Prioritize UTC timezones
      detail: `Timezone: ${offset}`,
      preselect: timezone === 'UTC',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, // Ensure full replacement
    });
  });

  return suggestions;
}
