/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { escapeIdentifier } from '../utils/escape_identifier';
import { append } from './append';

export function keep(...columns: Array<string | string[]>) {
  return append(
    `KEEP ${columns
      .flatMap((column) => column)
      .map((column) => escapeIdentifier(column))
      .join(', ')}`
  );
}
