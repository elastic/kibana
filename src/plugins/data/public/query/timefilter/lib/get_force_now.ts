/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parseQueryString } from './parse_querystring';

/** @internal */
export function getForceNow() {
  const forceNow = parseQueryString().forceNow as string;
  if (!forceNow) {
    return;
  }

  const ticks = Date.parse(forceNow);
  if (isNaN(ticks)) {
    throw new Error(`forceNow query parameter, ${forceNow}, can't be parsed by Date.parse`);
  }
  return new Date(ticks);
}
