/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const bypassToken = Symbol();

interface ExternalUrlCheckBypass {
  bypassToken: symbol;
  url: string;
}

export function bypassExternalUrlCheck(url: string): ExternalUrlCheckBypass {
  return { url, bypassToken };
}

export function isExternalUrlCheckBypass(value: unknown): value is ExternalUrlCheckBypass {
  return (
    typeof value === 'object' &&
    value !== null &&
    'bypassToken' in value &&
    value.bypassToken === bypassToken &&
    'url' in value &&
    typeof value.url === 'string'
  );
}
