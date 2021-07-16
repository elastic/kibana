/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const compact = (x: any): any => {
  if (typeof x !== 'object' || !x) {
    return x;
  }

  if (Array.isArray(x)) {
    const mapped = x.map(compact).filter((item) => item !== undefined);
    return mapped.length ? mapped : undefined;
  }

  const entries = Object.entries(x)
    .map(([k, v]) => [k, compact(v)])
    .filter(([, v]) => v !== undefined);

  return entries.length ? Object.fromEntries(entries) : undefined;
};
