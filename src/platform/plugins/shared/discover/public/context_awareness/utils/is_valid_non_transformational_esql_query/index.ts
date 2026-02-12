/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type AggregateQuery, type Query, isOfAggregateQueryType } from '@kbn/es-query';
import { hasTransformationalCommand } from '@kbn/esql-utils';
import { Parser } from '@kbn/esql-language';

export function isValidNonTransformationalESQLQuery(
  query: AggregateQuery | Query | undefined
): boolean {
  if (!isOfAggregateQueryType(query)) {
    return false;
  }

  const parsed = Parser.parse(query.esql);
  if (parsed.root.commands.length === 0 || parsed.errors.length > 0) {
    return false;
  }

  return !hasTransformationalCommand(query.esql);
}
