/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlValuesSource } from '@kbn/controls-constants';
import type { DataSource, FilterableField } from '@kbn/data-source';
import { appendStatsByToQuery, formatEsqlIdentifier, formatEsqlSources } from '@kbn/esql-utils';
import type { ValuesSourceFetchPlan } from './types';

/** How the values of a control are fetched, from its values source and its data source. */
export const getValuesSourceFetchPlan = ({
  valuesSource,
  esqlQuery,
  dataSource,
  field,
}: {
  valuesSource: ControlValuesSource | undefined;
  esqlQuery: string | undefined;
  dataSource: DataSource | undefined;
  field: FilterableField | undefined;
}): ValuesSourceFetchPlan | undefined => {
  // The plan is not known until the data source is loaded
  if (!dataSource) return undefined;
  // A `ControlValuesSource.ESQL` control already has its own user supplied query.
  if (valuesSource === ControlValuesSource.ESQL) {
    return { fetchMode: 'esql', query: esqlQuery };
  }
  if (dataSource.kind === 'index-pattern') {
    return { fetchMode: 'dsl', dataView: dataSource.getDataView() };
  }
  // An ES|QL source has no data view to search, so a field control on it runs a generated query.
  return {
    fetchMode: 'esql',
    // The field is not loaded yet when it is undefined
    query: field
      ? appendStatsByToQuery(
          `FROM ${formatEsqlSources(dataSource.title)}`,
          formatEsqlIdentifier(field.name)
        )
      : undefined,
  };
};

export const isSameFetchPlan = (a?: ValuesSourceFetchPlan, b?: ValuesSourceFetchPlan): boolean => {
  if (!a || !b) return a === b;
  if (a.fetchMode === 'dsl') return b.fetchMode === 'dsl' && a.dataView === b.dataView;
  return b.fetchMode === 'esql' && a.query === b.query;
};
