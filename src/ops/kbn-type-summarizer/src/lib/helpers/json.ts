/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { toError } from './error';

export function parseJson(json: string, from?: string) {
  try {
    return JSON.parse(json);
  } catch (_) {
    const error = toError(_);
    throw new Error(`Failed to parse JSON${from ? ` from ${from}` : ''}: ${error.message}`);
  }
}
