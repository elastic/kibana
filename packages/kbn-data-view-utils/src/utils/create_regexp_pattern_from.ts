/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const createRegExpPatternFrom = (basePatterns: string | string[]) => {
  const patterns = Array.isArray(basePatterns) ? basePatterns : [basePatterns];
  // Create the base patterns union with strict boundaries
  const basePatternGroup = `[^,\\s]*(\\b|_)(${patterns.join('|')})(\\b|_)([^,\\s]*)?`;
  // Apply base patterns union for local and remote clusters
  const localAndRemotePatternGroup = `((${basePatternGroup})|([^:,\\s]*:${basePatternGroup}))`;
  // Handle trailing comma and multiple pattern concatenation
  return new RegExp(`^${localAndRemotePatternGroup}(,${localAndRemotePatternGroup})*(,$|$)`, 'i');
};
