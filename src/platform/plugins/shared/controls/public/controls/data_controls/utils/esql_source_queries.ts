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

/** The queries that controls run on the FROM target of an ES|QL source, which can be a view. */
export const getFieldValuesQuery = ({ title }: FilterableSource, fieldName: string): string =>
  `FROM ${title} | STATS BY ${formatEsqlIdentifier(fieldName)}`;

export const getFieldMinMaxQuery = ({ title }: FilterableSource, fieldName: string): string => {
  const field = formatEsqlIdentifier(fieldName);
  return `FROM ${title} | STATS min = MIN(${field}), max = MAX(${field})`;
};

export const getAnyDocumentQuery = ({ title }: FilterableSource): string =>
  `FROM ${title} | LIMIT 1`;
