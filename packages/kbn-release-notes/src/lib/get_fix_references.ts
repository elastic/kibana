/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const FIXES_RE = /(?:closes|close|closed|fix|fixes|fixed|resolve|resolves|resolved)[ :]*(#\d*)/gi;

export function getFixReferences(prText: string) {
  const fixes: string[] = [];
  let match;
  while ((match = FIXES_RE.exec(prText))) {
    fixes.push(match[1]);
  }
  return fixes;
}
