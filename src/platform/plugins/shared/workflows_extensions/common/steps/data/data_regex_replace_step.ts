/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { REGEX_STEP_SECURITY_NOTES } from './regex_docs';
import type { CommonStepDefinition } from '../../step_registry/types';

export const DataRegexReplaceStepTypeId = 'data.regexReplace' as const;

export const ConfigSchema = z.object({
  source: z.unknown().describe(
    i18n.translate('workflowsExtensions.dataRegexReplaceStep.schema.source', {
      defaultMessage: 'Source string (or array of strings).',
    })
  ),
  detailed: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      i18n.translate('workflowsExtensions.dataRegexReplaceStep.schema.detailed', {
        defaultMessage: 'Include match details in the output.',
      })
    ),
});

export const InputSchema = z.object({
  pattern: z
    .string()
    .max(10000, 'Pattern exceeds maximum allowed length of 10,000 characters')
    .describe(
      i18n.translate('workflowsExtensions.dataRegexReplaceStep.schema.pattern', {
        defaultMessage: 'Regular expression.',
      })
    ),
  replacement: z.string().describe(
    i18n.translate('workflowsExtensions.dataRegexReplaceStep.schema.replacement', {
      defaultMessage: 'Replacement string.',
    })
  ),
  flags: z
    .string()
    .optional()
    .describe(
      i18n.translate('workflowsExtensions.dataRegexReplaceStep.schema.flags', {
        defaultMessage: 'Regex flags.',
      })
    ),
});

export const OutputSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.object({
    original: z.unknown(),
    replaced: z.unknown(),
    matchCount: z.number(),
  }),
]);

export type DataRegexReplaceStepConfigSchema = typeof ConfigSchema;
export type DataRegexReplaceStepInputSchema = typeof InputSchema;
export type DataRegexReplaceStepOutputSchema = typeof OutputSchema;

export const dataRegexReplaceStepCommonDefinition: CommonStepDefinition<
  DataRegexReplaceStepInputSchema,
  DataRegexReplaceStepOutputSchema,
  DataRegexReplaceStepConfigSchema
> = {
  id: DataRegexReplaceStepTypeId,
  category: StepCategory.Data,
  label: i18n.translate('workflowsExtensions.dataRegexReplaceStep.label', {
    defaultMessage: 'Replace with Regex',
  }),
  description: i18n.translate('workflowsExtensions.dataRegexReplaceStep.description', {
    defaultMessage: 'Replace text patterns using regular expressions',
  }),
  documentation: {
    details: i18n.translate('workflowsExtensions.dataRegexReplaceStep.documentation.details', {
      defaultMessage: `The {stepTypeId} step performs pattern-based text replacements using regular expressions. It supports backreferences, named groups, and can process single strings or arrays.`,
      values: { stepTypeId: DataRegexReplaceStepTypeId },
    }),
    notes: REGEX_STEP_SECURITY_NOTES,
    examples: [
      `## Simple text replacement
\`\`\`yaml
- name: sanitize-message
  type: ${DataRegexReplaceStepTypeId}
  source: "\${{ steps.user_input.output.text }}"
  with:
    pattern: "\\\\b(password|secret|token)\\\\b"
    replacement: "***"
    flags: "gi"

# Input: "My password is secret"
# Output: "My *** is ***"
\`\`\``,

      `## Replacement with backreferences
\`\`\`yaml
- name: format-phone
  type: ${DataRegexReplaceStepTypeId}
  source: "\${{ steps.input.output }}"
  with:
    pattern: "(\\\\d{3})(\\\\d{3})(\\\\d{4})"
    replacement: "($1) $2-$3"

# Input: "5551234567"
# Output: "(555) 123-4567"
\`\`\``,

      `## Process array of strings
\`\`\`yaml
- name: clean-emails
  type: ${DataRegexReplaceStepTypeId}
  source: "\${{ steps.get_emails.output }}"
  with:
    pattern: "@old\\\\.domain\\\\.com"
    replacement: "@new.domain.com"

# Input: ["user1@old.domain.com", "user2@old.domain.com"]
# Output: ["user1@new.domain.com", "user2@new.domain.com"]
\`\`\``,

      `## Global vs single replacement
\`\`\`yaml
# Replace all occurrences
- name: replace-all
  type: ${DataRegexReplaceStepTypeId}
  source: "\${{ steps.input.output }}"
  with:
    pattern: "foo"
    replacement: "bar"
    flags: "g"

# Replace only first occurrence
- name: replace-first
  type: ${DataRegexReplaceStepTypeId}
  source: "\${{ steps.input.output }}"
  with:
    pattern: "foo"
    replacement: "bar"
\`\`\``,

      `## Detailed output for observability
\`\`\`yaml
- name: track-replacements
  type: ${DataRegexReplaceStepTypeId}
  source: "\${{ steps.input.output }}"
  detailed: true
  with:
    pattern: "error"
    replacement: "warning"
    flags: "gi"

# Output: 
# {
#   original: "Error occurred. Another error found.",
#   replaced: "warning occurred. Another warning found.",
#   matchCount: 2
# }

# Note: matchCount is only accurate when the global flag (g) is set.
# Without the global flag, matchCount will be 1 if there's a match, 0 otherwise.
\`\`\``,

      `## Named group replacement
\`\`\`yaml
- name: format-date
  type: ${DataRegexReplaceStepTypeId}
  source: "\${{ steps.input.output }}"
  with:
    pattern: "(?<year>\\\\d{4})-(?<month>\\\\d{2})-(?<day>\\\\d{2})"
    replacement: "\$<month>/\$<day>/\$<year>"

# Input: "2024-01-15"
# Output: "01/15/2024"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
