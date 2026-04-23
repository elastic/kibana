/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser, WrappingPrettyPrinter } from '@elastic/esql';

/**
 * Prettifies an ES|QL query using the @elastic/esql parser and multiline pretty printer.
 */
export const prettifyQuery = (src: string): string => {
  const { root } = Parser.parse(src, { withFormatting: true });
  return WrappingPrettyPrinter.print(root, { multiline: true });
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
