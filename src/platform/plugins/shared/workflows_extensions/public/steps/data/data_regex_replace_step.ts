/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  dataRegexReplaceStepCommonDefinition,
  DataRegexReplaceStepTypeId,
} from '../../../common/steps/data';
import { ActionsMenuGroup, type PublicStepDefinition } from '../../step_registry/types';

export const dataRegexReplaceStepDefinition: PublicStepDefinition = {
  ...dataRegexReplaceStepCommonDefinition,
  label: i18n.translate('workflowsExtensions.dataRegexReplaceStep.label', {
    defaultMessage: 'Replace with Regex',
  }),
  description: i18n.translate('workflowsExtensions.dataRegexReplaceStep.description', {
    defaultMessage: 'Replace text patterns using regular expressions',
  }),
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/pencil').then(({ icon }) => ({
      default: icon,
    }))
  ),
  actionsMenuGroup: ActionsMenuGroup.data,
  documentation: {
    details: i18n.translate('workflowsExtensions.dataRegexReplaceStep.documentation.details', {
      defaultMessage: `The ${DataRegexReplaceStepTypeId} step performs pattern-based text replacements using regular expressions. It supports backreferences, named groups, and can process single strings or arrays.

**Security Note**: Complex regex patterns can cause performance issues (ReDoS - Regular Expression Denial of Service). The step enforces a maximum input length of 100KB per string. Avoid patterns with nested quantifiers like (a+)+, (a*)+, or (a|a)* which can cause catastrophic backtracking and hang the server.`,
    }),
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
};
