/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery } from '@kbn/es-query';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import { CONSTANTS } from '../data_model/types';
import type { Data, VegaSpec } from '../data_model/types';

const isEsqlDataObject = (dataObj: Data) =>
  Boolean(dataObj.url && dataObj.url[CONSTANTS.TYPE] === 'esql');

const getEsqlDataObjects = (spec: VegaSpec): Data[] => {
  if (!spec.data) return [];
  const dataObjects = Array.isArray(spec.data) ? spec.data : [spec.data];
  return dataObjects.filter(isEsqlDataObject);
};

/**
 * Whether a Vega specification contains at least one ES|QL data source.
 */
export function specUsesEsql(spec: VegaSpec): boolean {
  return getEsqlDataObjects(spec).length > 0;
}

/**
 * ES|QL `data.url.query` strings from the same top-level data sources `specUsesEsql` inspects.
 */
export function getEsqlQueriesFromSpec(spec: VegaSpec): string[] {
  return getEsqlDataObjects(spec)
    .map((dataObj) => dataObj.url?.query)
    .filter((query): query is string => typeof query === 'string');
}

/**
 * Derived ES|QL query for related-panel highlighting. Multi-source specs publish a synthetic
 * query whose variable names are the union of those used in each source.
 */
export function getPublishedEsqlQuery(spec: VegaSpec | undefined): AggregateQuery | undefined {
  if (!spec) {
    return undefined;
  }

  const queries = getEsqlQueriesFromSpec(spec);
  if (queries.length === 0) {
    return undefined;
  }
  if (queries.length === 1) {
    return { esql: queries[0] };
  }

  const names = [...new Set(queries.flatMap((query) => getESQLQueryVariables(query)))];
  const where = names.map((name) => `?${name} == ?${name}`).join(' AND ');
  return { esql: where ? `FROM index | WHERE ${where}` : 'FROM index' };
}
