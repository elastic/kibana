/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Characters that a source name cannot have unquoted.
const NEEDS_QUOTES = /["=|[\]/\s]/;

const formatEsqlSource = (source: string): string => {
  const remote = source.match(/^([^:]+):(?!:)(.*)$/s);
  const [cluster, index] = remote ? [remote[1], remote[2]] : [undefined, source];
  const formattedIndex = NEEDS_QUOTES.test(index)
    ? `"${index.replace(/(["\\])/g, '\\$1')}"`
    : index;
  return cluster ? `${cluster}:${formattedIndex}` : formattedIndex;
};

/**
 * Writes the sources of a source command from their index pattern, as `getIndexPatternFromESQLQuery`
 * returns it (comma separated, with the quotes of the query taken out): each source that cannot be
 * written without quotes is quoted. A source name that has a comma cannot be told apart.
 */
export const formatEsqlSources = (indexPattern: string): string =>
  indexPattern.split(',').map(formatEsqlSource).join(', ');
