/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export function versionSatisfies(cleanActual, cleanExpected) {
  try {
    return cleanActual === cleanExpected;
  } catch (err) {
    return false;
  }
}

export function cleanVersion(version) {
  const match = version.match(/\d+\.\d+\.\d+/);
  if (!match) return version;
  return match[0];
}
