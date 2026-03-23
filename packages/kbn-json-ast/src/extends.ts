/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setProp } from './props';

/**
 * Sets the `extends` property at the top of a JSONC tsconfig source string.
 * If the property already exists, its value is replaced.
 * @param jsonc - The JSONC tsconfig source text to modify.
 * @param value - The path to set as the `extends` value.
 * @returns The modified JSONC source text.
 */
export function setExtends(jsonc: string, value: string) {
  return setProp(jsonc, 'extends', value, {
    insertAtTop: true,
  });
}
