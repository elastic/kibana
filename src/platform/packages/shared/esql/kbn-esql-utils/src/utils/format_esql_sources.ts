/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { shouldBeQuotedSource } from '@kbn/esql-language';
import { escapeStringValue } from './append_to_query/utils';

/**
 * Writes the sources of a source command from their index pattern, as `getIndexPatternFromESQLQuery`
 * returns it (comma separated, with the quotes of the query taken out): each source that the lexer
 * cannot read unquoted is quoted. A source name that has a comma cannot be told apart.
 */
export const formatEsqlSources = (indexPattern: string): string =>
  indexPattern
    .split(',')
    .map((source) => (shouldBeQuotedSource(source) ? escapeStringValue(source) : source))
    .join(', ');
