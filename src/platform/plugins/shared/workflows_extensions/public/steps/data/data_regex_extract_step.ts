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
  dataRegexExtractStepCommonDefinition,
  DataRegexExtractStepTypeId,
} from '../../../common/steps/data';
import { ActionsMenuGroup, type PublicStepDefinition } from '../../step_registry/types';

export const dataRegexExtractStepDefinition: PublicStepDefinition = {
  ...dataRegexExtractStepCommonDefinition,
  label: i18n.translate('workflowsExtensions.dataRegexExtractStep.label', {
    defaultMessage: 'Extract with Regex',
  }),
  description: i18n.translate('workflowsExtensions.dataRegexExtractStep.description', {
    defaultMessage: 'Extract fields from text using regular expression capture groups',
  }),
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/search').then(({ icon }) => ({
      default: icon,
    }))
  ),
  actionsMenuGroup: ActionsMenuGroup.data,
  documentation: {
    details: i18n.translate('workflowsExtensions.dataRegexExtractStep.documentation.details', {
      defaultMessage: `The ${DataRegexExtractStepTypeId} step extracts structured data from text using regular expression capture groups. It supports both named groups and numbered groups, and can process single strings or arrays.

**Security Note**: Complex regex patterns can cause performance issues (ReDoS - Regular Expression Denial of Service). The step enforces a maximum input length of 100KB per string. Avoid patterns with nested quantifiers like (a+)+, (a*)+, or (a|a)* which can cause catastrophic backtracking and hang the server.`,
    }),
    examples: [
      `## Extract using named capture groups
\`\`\`yaml
- name: parse-log-line
  type: ${DataRegexExtractStepTypeId}
  source: "\${{ steps.fetch_logs.output.message }}"
  with:
    pattern: "^(?<timestamp>\\\\d{4}-\\\\d{2}-\\\\d{2}) (?<level>\\\\w+) (?<msg>.*)$"
    fields:
      timestamp: "timestamp"
      level: "level"
      msg: "msg"

# Output: { timestamp: "2024-01-15", level: "ERROR", msg: "Connection failed" }
\`\`\``,

      `## Extract using numbered capture groups
\`\`\`yaml
- name: parse-version
  type: ${DataRegexExtractStepTypeId}
  source: "\${{ steps.get_version.output }}"
  with:
    pattern: "(\\\\d+)\\\\.(\\\\d+)\\\\.(\\\\d+)"
    fields:
      major: "$1"
      minor: "$2"
      patch: "$3"

# Input: "v1.2.3"
# Output: { major: "1", minor: "2", patch: "3" }
\`\`\``,

      `## Process array of strings
\`\`\`yaml
- name: parse-multiple-logs
  type: ${DataRegexExtractStepTypeId}
  source: "\${{ steps.fetch_logs.output }}"
  with:
    pattern: "\\\\[(?<level>\\\\w+)\\\\] (?<message>.*)"
    fields:
      level: "level"
      message: "message"

# Input: ["[INFO] Started", "[ERROR] Failed"]
# Output: [{ level: "INFO", message: "Started" }, { level: "ERROR", message: "Failed" }]
\`\`\``,

      `## Handle no match with error
\`\`\`yaml
- name: parse-strict
  type: ${DataRegexExtractStepTypeId}
  source: "\${{ steps.input.output }}"
  errorIfNoMatch: true
  with:
    pattern: "ID: (\\\\d+)"
    fields:
      id: "$1"

# If pattern doesn't match, step returns an error
\`\`\``,

      `## Case-insensitive extraction
\`\`\`yaml
- name: parse-flexible
  type: ${DataRegexExtractStepTypeId}
  source: "\${{ steps.input.output }}"
  with:
    pattern: "error: (.*)"
    fields:
      error: "$1"
    flags: "i"

# Matches "Error:", "ERROR:", "error:", etc.
\`\`\``,
    ],
  },
};
