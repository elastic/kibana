/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function addLog(message: string, payload?: unknown) {
  // @ts-expect-error
  if (window.ELASTIC_DISCOVER_LOGGER) {
    // eslint-disable-next-line no-console
    console.log(message, payload);
  }
}
