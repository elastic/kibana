/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_BUILTIN_REGEX_RULES } from '@kbn/ai-anonymization-common';

const MAX_LENGTH = 2000;

// Shared email, IP and host name rules; phone numbers and names have no shared regex rule.
const BUILTIN_RULES = DEFAULT_BUILTIN_REGEX_RULES.filter(({ enabled }) => enabled).map(
  ({ pattern, entityClass }) => [new RegExp(pattern, 'g'), `[${entityClass}]`] as const
);

// Separated digit groups or a compact international number; dates, decimals and ids never match.
const PHONE_PATTERN =
  /(?:\+\d{1,3}[\s-]?)?(?:\(\d{2,4}\)|\d{2,4}[\s-])[\s-]?\d{3,4}[\s-]\d{3,4}\b|\+\d{9,15}\b/g;

// Two or more consecutive capitalised words; a single one is kept for sentence starts and identifiers.
const NAME_PATTERN = /\p{Lu}\p{Ll}+(?: +\p{Lu}\p{Ll}+)+/gu;

/** Masks common personal data patterns in telemetry text and bounds its length. */
export const anonymizeText = (text: string): string =>
  BUILTIN_RULES.reduce((result, [pattern, mask]) => result.replace(pattern, mask), text)
    .replace(PHONE_PATTERN, '[PHONE]')
    .replace(NAME_PATTERN, '[NAME]')
    .slice(0, MAX_LENGTH);
