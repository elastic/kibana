/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEsqlFilterableSource } from '@kbn/data-source';
import type { FilterableField, FilterableSource } from '@kbn/data-source';
import { formatEsqlIdentifier, formatEsqlSources } from '@kbn/esql-utils';

/**
 * The query that populates a control on a field of an ES|QL source, as the query that the user
 * writes in the editor does. Undefined for the other sources.
 */
export const getEsqlSourceFieldQuery = (
  source?: FilterableSource,
  field?: FilterableField
): string | undefined =>
  source && field && isEsqlFilterableSource(source)
    ? `FROM ${formatEsqlSources(source.title)} | STATS BY ${formatEsqlIdentifier(field.name)}`
    : undefined;
