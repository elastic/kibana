/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const I18N_RC = '.i18nrc.json';

/**
 * Fast pre-filter: skip files that can't possibly contain i18n call sites,
 * avoiding expensive ts.transpileModule on the vast majority of source files.
 *
 * Checks for `@kbn/i18n` imports (also matches `@kbn/i18n-react`) to short-circuit
 * early, plus usage-pattern fallbacks for edge cases like re-exported i18n helpers.
 */
export const I18N_CALL_PATTERN =
  /@kbn\/i18n|\btranslate\(|FormattedMessage|defineMessages|\.formatMessage\(/;
