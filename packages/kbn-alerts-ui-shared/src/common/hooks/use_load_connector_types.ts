/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@tanstack/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import { fetchConnectorTypes } from '../apis';

export interface UseLoadConnectorTypesProps {
  http: HttpStart;
  includeSystemActions?: boolean;
  enabled?: boolean;
}

export const useLoadConnectorTypes = (props: UseLoadConnectorTypesProps) => {
  const { http, includeSystemActions, enabled = true } = props;

  const queryFn = () => {
    return fetchConnectorTypes({ http, includeSystemActions });
  };

  const { data, isLoading, isFetching, isInitialLoading } = useQuery({
    queryKey: ['useLoadConnectorTypes', includeSystemActions],
    queryFn,
    refetchOnWindowFocus: false,
    enabled,
  });

  return {
    data,
    isInitialLoading,
    isLoading: isLoading || isFetching,
  };
};
