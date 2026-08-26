/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

/** Shared ReDoS / security notes for data.regexExtract and data.regexReplace. */
export const REGEX_STEP_SECURITY_NOTES = [
  i18n.translate('workflowsExtensions.dataRegexSteps.documentation.notes.redos', {
    defaultMessage:
      '**Security note**: Complex regex patterns can cause performance issues (ReDoS — Regular Expression Denial of Service). This step uses the JavaScript regex engine and enforces a maximum input length of 100 KB per string. Avoid nested quantifiers like {nestedPlus}, {nestedStar}, or {alternationStar}, and unbounded quantifiers (for example, .* or .+) applied to overlapping character classes — they can cause catastrophic backtracking and hang the server.',
    values: {
      nestedPlus: '(a+)+',
      nestedStar: '(a*)+',
      alternationStar: '(a|a)*',
    },
  }),
  i18n.translate('workflowsExtensions.dataRegexSteps.documentation.notes.testPatterns', {
    defaultMessage: 'Test patterns with representative input before running at scale.',
  }),
];
