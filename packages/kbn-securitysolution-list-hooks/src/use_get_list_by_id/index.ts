/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@tanstack/react-query';
import { getListById, ApiParams } from '@kbn/securitysolution-list-api';
import { withOptionalSignal } from '@kbn/securitysolution-hook-utils';

const getListByIdWithOptionalSignal = withOptionalSignal(getListById);

const GET_LIST_BY_ID_QUERY_KEY = 'GET_LIST_BY_ID';
export const useGetListById = ({ http, id }: { http: ApiParams['http']; id: string }) => {
  return useQuery(
    [GET_LIST_BY_ID_QUERY_KEY, id],
    async ({ signal }) => {
      const respone = await getListByIdWithOptionalSignal({ http, signal, id });
      return respone;
    },
    {
      refetchOnWindowFocus: false,
    }
  );
};
