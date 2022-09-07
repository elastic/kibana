/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function parseLinkHeader(header: string): null | Record<string, string> {
  if (!header) {
    return null;
  }

  const entries = header.split(',').map((p) => p.trim());

  const parsed: Record<string, string> = {};
  for (const entry of entries) {
    const parts = entry.split(';', 2).map((p) => p.trim());
    const url = parts[0].slice(1, -1);
    const rel = parts[1].replace(/rel="?([^"]+)"?$/, '$1');
    parsed[rel] = url;
  }

  return parsed;
}
