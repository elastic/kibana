/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const normalizeSetCookieHeader = (header: unknown): string[] => {
  if (header == null) {
    return [];
  }
  return (Array.isArray(header) ? header : [header])
    .map(String)
    .filter((cookie) => cookie.length > 0);
};

/**
 * Merges `Set-Cookie` values the way Hapi's state API does: clearing cookies remove prior
 * values with the same name; later values win for the same name.
 *
 * @internal
 */
export const mergeSetCookieHeaderValues = (
  existingHeader: unknown,
  cookieStrings: string[]
): string[] => {
  let merged = normalizeSetCookieHeader(existingHeader);
  for (const cookie of cookieStrings) {
    const cookieName = cookie.split('=')[0];
    merged = merged.filter((existingCookie) => !existingCookie.startsWith(`${cookieName}=`));
    merged.push(cookie);
  }

  // Multiple lifecycle hooks may clear/set the same cookie; keep the last value per name.
  const lastByName = new Map<string, string>();
  for (const cookie of merged) {
    lastByName.set(cookie.split('=')[0], cookie);
  }
  return [...lastByName.values()];
};
