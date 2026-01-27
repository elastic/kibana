/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { QueryClient } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type {
  ResponseOpsQueryMeta,
  QueryOptionsOverrides,
} from '@kbn/response-ops-react-query/types';
import type { HttpStart } from '@kbn/core-http-browser';
import { useResponseOpsQueryClient } from '@kbn/response-ops-react-query/hooks/use_response_ops_query_client';
import { queryKeys } from '../constants';
import type { Case, CasesBulkGetResponse } from '../apis/bulk_get_cases';
import { bulkGetCases } from '../apis/bulk_get_cases';

const ERROR_TITLE = i18n.translate('xpack.triggersActionsUI.cases.api.bulkGet', {
  defaultMessage: 'Error fetching cases data',
});

const transformCases = (data: CasesBulkGetResponse): Map<string, Case> => {
  const casesMap = new Map();
  for (const theCase of data?.cases ?? []) {
    casesMap.set(theCase.id, { ...theCase });
  }
  return casesMap;
};

export interface UseBulkGetCasesQueryParams {
  caseIds: string[];
  http: HttpStart;
}

export const useBulkGetCasesQuery = (
  { caseIds, http }: UseBulkGetCasesQueryParams,
  options?: Pick<QueryOptionsOverrides<typeof bulkGetCases>, 'enabled'> & {
    queryClient?: QueryClient;
  }
) => {
  const { enabled, queryClient } = options || {};
  const alertingQueryClient = useResponseOpsQueryClient();
  return useQuery(
    {
      queryKey: queryKeys.casesBulkGet(caseIds),
      queryFn: ({ signal }) => bulkGetCases(http, { ids: caseIds }, signal),
      enabled: caseIds.length > 0 && enabled !== false,
      select: transformCases,
      meta: {
        getErrorToast: (error) => {
          if (error.name !== 'AbortError') {
            return {
              type: 'error',
              title: ERROR_TITLE,
            };
          }
        },
      } satisfies ResponseOpsQueryMeta,
    },
    queryClient ?? alertingQueryClient
  );
};
