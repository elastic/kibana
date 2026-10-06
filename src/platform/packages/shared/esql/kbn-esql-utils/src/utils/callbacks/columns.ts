/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { TimeRange } from '@kbn/es-query';
import type { ISearchGeneric } from '@kbn/search-types';
import type { HttpStart } from '@kbn/core/public';
import type { ESQLControlVariable, EsqlFieldType, ESQLFieldWithMetadata } from '@kbn/esql-types';
import { getESQLQueryColumnsRaw } from '../run_query';
import { getESQLSourceInfo } from '../get_source_info';
import { getESQLQueryVariables } from '../query_parsing_helpers';

const toFieldWithMetadata = (
  name: string,
  type: string,
  originalTypes: string[] | undefined
): ESQLFieldWithMetadata => {
  const hasConflict = type === 'unsupported' && (originalTypes?.length ?? 0) > 1;
  return {
    name,
    type: type as EsqlFieldType,
    hasConflict,
    originalTypes: hasConflict ? originalTypes : undefined,
    userDefined: false,
  };
};

/**
 * Gets the columns of an ESQL query, formatted as ESQLFieldWithMetadata
 * @param esqlQuery The ESQL query to execute
 * @param search The search service to use
 * @param variables Optional ESQL control variables to substitute in the query
 * @param signal Optional AbortSignal to cancel the request
 * @param timeRange Optional time range for the query
 * @returns A promise that resolves to an array of ESQLFieldWithMetadata
 */
export const getEsqlColumns = async ({
  esqlQuery,
  search,
  variables,
  signal,
  timeRange,
}: {
  search: ISearchGeneric;
  esqlQuery?: string;
  variables?: ESQLControlVariable[];
  signal?: AbortSignal;
  timeRange?: TimeRange;
}): Promise<ESQLFieldWithMetadata[]> => {
  if (esqlQuery) {
    try {
      const columns = await getESQLQueryColumnsRaw({
        esqlQuery,
        search,
        dropNullColumns: true,
        variables: variables ?? [],
        signal,
        timeRange,
      });
      return columns.map(({ name, type, original_types: originalTypes }) =>
        toFieldWithMetadata(name, type, originalTypes)
      );
    } catch (error) {
      // Handle error
      return [];
    }
  }
  return [];
};

/**
 * Same result as {@link getEsqlColumns}, fetched through the source info route whose cache
 * `EsqlSource` shares, so a `FROM x | LIMIT 0` is requested once per page.
 */
export const getEsqlSourceColumns = async ({
  esqlQuery,
  http,
  projectRouting,
  variables,
  timeRange,
  signal,
}: {
  esqlQuery?: string;
  http: HttpStart;
  projectRouting?: string;
  variables?: ESQLControlVariable[];
  timeRange?: TimeRange;
  signal?: AbortSignal;
}): Promise<ESQLFieldWithMetadata[]> => {
  if (!esqlQuery) {
    return [];
  }
  // Only the referenced variables, so the cache key doesn't change with unrelated controls.
  const usedVariableNames = new Set(getESQLQueryVariables(esqlQuery));
  const usedVariables = variables?.filter(({ key }) => usedVariableNames.has(key));
  try {
    const { columns } = await getESQLSourceInfo({
      query: esqlQuery,
      http,
      projectRouting,
      timeRange: timeRange && { from: timeRange.from, to: timeRange.to },
      esqlVariables: usedVariables,
      signal,
    });
    return columns.map(({ name, esType, originalTypes }) =>
      toFieldWithMetadata(name, esType, originalTypes)
    );
  } catch (error) {
    return [];
  }
};
