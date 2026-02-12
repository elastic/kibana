/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISearchGeneric } from '@kbn/search-types';
import { useQuery } from '@kbn/react-query';
import { getESQLQueryColumnsRaw } from '@kbn/esql-utils';

export interface QueryColumn {
  name: string;
  type: string;
}

interface UseQueryColumnsProps {
  query: string;
  search: ISearchGeneric;
}

export const useQueryColumns = ({ query, search }: UseQueryColumnsProps) => {
  const columnsQuery = useQuery({
    queryKey: ['queryColumns', query],
    queryFn: async ({ signal }) => {
      const rawColumns = await getESQLQueryColumnsRaw({
        esqlQuery: query,
        search,
        signal,
        dropNullColumns: true,
      });

      return rawColumns.map(({ name, type }) => ({ name, type }));
    },
    enabled: Boolean(query),
    refetchOnWindowFocus: false,
    retry: false,
  });

  return {
    ...columnsQuery,
    data: columnsQuery.data ?? [],
  };
};
