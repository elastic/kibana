/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function parseLinkHeader(
  header: string,
  relativeToBase?: string
): null | Record<string, string> {
  if (!header) {
    return null;
  }

  const entries = header.split(',').map((p) => p.trim());

  const parsed: Record<string, string> = {};
  for (const entry of entries) {
    const parts = entry.split(';', 2).map((p) => p.trim());
    const url = parts[0].slice(1, -1);
    const rel = parts[1].replace(/rel="?([^"]+)"?$/, '$1');

    if (relativeToBase) {
      const urlObj = new URL(url);
      if (urlObj.origin === relativeToBase) {
        parsed[rel] = urlObj.pathname + urlObj.search;
      } else {
        parsed[rel] = url;
      }
    } else {
      parsed[rel] = url;
    }
  }

  return parsed;
}
