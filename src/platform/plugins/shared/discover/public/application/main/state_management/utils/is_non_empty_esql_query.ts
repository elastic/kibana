/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import type { AggregateQuery, Query } from '@kbn/es-query';

/** Narrows to an ES|QL query whose text is not blank. */
export const isNonEmptyEsqlQuery = (
  query: Query | AggregateQuery | undefined
): query is AggregateQuery => isOfAggregateQueryType(query) && query.esql.trim() !== '';
