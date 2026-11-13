/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatEsqlIdentifier } from '@kbn/esql-utils';
import type { FilterableSource } from '@kbn/data-source';

const getSourceQuery = ({ sourceQuery, title }: FilterableSource): string =>
  sourceQuery ?? `FROM ${title}`;

/** The queries that controls run on the FROM target of an ES|QL source, which can be a view. */
export const getFieldValuesQuery = (source: FilterableSource, fieldName: string): string =>
  `${getSourceQuery(source)} | STATS BY ${formatEsqlIdentifier(fieldName)}`;

export const getFieldMinMaxQuery = (source: FilterableSource, fieldName: string): string => {
  const field = formatEsqlIdentifier(fieldName);
  return `${getSourceQuery(source)} | STATS min = MIN(${field}), max = MAX(${field})`;
};

export const getHasDocumentsQuery = (source: FilterableSource): string =>
  `${getSourceQuery(source)} | LIMIT 1`;
