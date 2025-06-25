/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeColumn } from '../utils/formatters';
import { append } from '../append';

export function keep(...columns: Array<string | string[]>) {
  const command = `KEEP ${columns
    .flatMap((column) => column)
    .map((column) => escapeColumn(column))
    .join(', ')}`;

  return append({ command });
}
