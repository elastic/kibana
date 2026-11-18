/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlValuesSource } from '@kbn/controls-constants';
import { isEsqlFilterableSource } from '@kbn/data-source';
import type { FilterableField, FilterableSource } from '@kbn/data-source';
import { appendStatsByToQuery, formatEsqlIdentifier, formatEsqlSources } from '@kbn/esql-utils';

/**
 * The query that populates a control on a field of an ES|QL source, as the query that the user
 * writes in the editor does. Undefined for the other sources.
 */
export const getEsqlSourceFieldQuery = (
  source?: FilterableSource,
  field?: FilterableField
): string | undefined =>
  source && field && isEsqlFilterableSource(source)
    ? appendStatsByToQuery(
        `FROM ${formatEsqlSources(source.title)}`,
        formatEsqlIdentifier(field.name)
      )
    : undefined;

/**
 * How the values of a control are actually fetched, once the configured `ControlValuesSource`
 * and the type of the data source are both taken into account.
 * - `esql`: fetched with an ES|QL query. `query` is undefined for a `ControlValuesSource.ESQL`
 *   control that has no query yet.
 * - `dsl`: fetched with a DSL request on the field of a data view.
 */
export type ValuesSourceFetchPlan = { fetchMode: 'esql'; query?: string } | { fetchMode: 'dsl' };

export const resolveValuesSourceFetchPlan = ({
  valuesSource,
  esqlQuery,
  dataSource,
  field,
}: {
  valuesSource?: ControlValuesSource;
  esqlQuery?: string;
  dataSource?: FilterableSource;
  field?: FilterableField;
}): ValuesSourceFetchPlan => {
  // A `ControlValuesSource.ESQL` control already has its own user supplied query.
  if (valuesSource === ControlValuesSource.ESQL) return { fetchMode: 'esql', query: esqlQuery };
  // A field control on an ES|QL source has no data view to search, so it runs a generated query.
  const generatedQuery = getEsqlSourceFieldQuery(dataSource, field);
  return generatedQuery ? { fetchMode: 'esql', query: generatedQuery } : { fetchMode: 'dsl' };
};
