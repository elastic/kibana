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

/** Builds a `FROM` query for a view, quoting the name when the ES|QL lexer cannot read it unquoted. */
export const getViewEsqlQuery = (viewName: string): string => {
  const source = shouldBeQuotedSource(viewName) ? escapeStringValue(viewName) : viewName;

  return `FROM ${source}`;
};
