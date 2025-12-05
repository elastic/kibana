/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const prettifyQuery = (src: string): string => {
  // Split by pipes and format each command on its own line with indentation
  const parts = src.split('|').map((part) => part.trim());

  return parts
    .map((part, index) => {
      if (index === 0) {
        // First part (FROM command) - no leading pipe or indentation
        return part;
      } else {
        // All subsequent commands start with pipe and have 2-space indentation
        return `  | ${part}`;
      }
    })
    .join('\n');
};

export const prettifyQueryTemplate = (query: string) => {
  const formattedQuery = prettifyQuery(query);
  // remove the FROM command if it exists
  const queryParts = formattedQuery.split('|');
  // If there's only one part (no pipes), return empty string
  if (queryParts.length <= 1) {
    return '';
  }
  return `\n|${queryParts.slice(1).join('|')}`;
};
