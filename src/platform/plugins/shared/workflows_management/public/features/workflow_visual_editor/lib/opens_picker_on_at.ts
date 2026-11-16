/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Whether a typed `@` opens the reference picker. Not where `@` is part of the language (`@timestamp`
 * in ES|QL, `"@timestamp"` in JSON): the next characters would land in the picker, not in the field.
 */
export const opensPickerOnAt = (language: string | undefined): boolean =>
  language !== 'esql' && language !== 'json' && language !== 'json-liquid';
