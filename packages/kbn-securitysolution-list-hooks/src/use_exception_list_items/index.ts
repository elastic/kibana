/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ExceptionListItemSchema,
  NamespaceType,
  Pagination,
  UseExceptionListItemProps,
} from '@kbn/securitysolution-io-ts-list-types';
import { fetchExceptionItems } from '@kbn/securitysolution-list-api';

import { getIdsAndNamespaces } from '@kbn/securitysolution-list-utils';
import { transformInput } from '../transforms';

type Func = () => void;
export type ReturnExceptionListAndItems = [
  boolean,
  ExceptionListItemSchema[],
  Pagination,
  Func | null
];

/**
 * Hook for using to get an ExceptionList and its ExceptionListItems
 *
 * @param http Kibana http service
 * @param lists array of ExceptionListIdentifiers for all lists to fetch
 * @param onError error callback
 * @param onSuccess callback when all lists fetched successfully
 * @param filterOptions optional - filter by fields or tags
 * @param showDetectionsListsOnly boolean, if true, only detection lists are searched
 * @param showEndpointListsOnly boolean, if true, only endpoint lists are searched
 * @param matchFilters boolean, if true, applies first filter in filterOptions to
 * all lists
 * @param pagination optional
 *
 */
export const useExceptionListItems = ({
  http,
  lists,
  filters,
  pit,
  searchAfter,
  pagination = {
    page: 1,
    perPage: 20,
    total: 0,
  },
}: UseExceptionListItemProps): ReturnExceptionListAndItems => {
  const [exceptionItems, setExceptionListItems] = useState<ExceptionListItemSchema[]>([]);
  const [paginationInfo, setPagination] = useState<Pagination>(pagination);
  const fetchExceptionListsItems = useRef<Func | null>(null);
  const [loading, setLoading] = useState(true);
  const { ids, namespaces }: { ids: string[] | undefined; namespaces: NamespaceType[] } =
    useMemo(() => {
      if (lists != null) {
        return getIdsAndNamespaces({ lists });
      } else {
        return { ids: undefined, namespaces: ['single', 'agnostic'] };
      }
    }, [lists]);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async (): Promise<void> => {
      try {
        setLoading(true);

        const {
          page,
          per_page: perPage,
          total,
          data,
        } = await fetchExceptionItems({
          filters,
          http,
          listIds: ids,
          namespaceTypes: namespaces,
          pagination: {
            page: pagination.page,
            perPage: pagination.perPage,
          },
          pit,
          searchAfter,
          signal: abortCtrl.signal,
        });

        // Please see `x-pack/plugins/lists/public/exceptions/transforms.ts` doc notes
        // for context around the temporary `id`
        const transformedData = data.map((item) => transformInput(item));

        if (isSubscribed) {
          setPagination({
            page,
            perPage,
            total,
          });
          setExceptionListItems(transformedData);
        }
      } catch (error) {
        if (isSubscribed) {
          setExceptionListItems([]);
          setPagination({
            page: 1,
            perPage: 20,
            total: 0,
          });
        }
      }

      if (isSubscribed) {
        setLoading(false);
      }
    };

    fetchData();

    fetchExceptionListsItems.current = fetchData;
    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [http, ids, namespaces]);

  return [loading, exceptionItems, paginationInfo, fetchExceptionListsItems.current];
};
