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
import { fetchConnectors } from '../apis';

export interface UseLoadConnectorsProps {
  http: HttpStart;
  includeSystemActions?: boolean;
}

export const useLoadConnectors = (props: UseLoadConnectorsProps) => {
  const { http, includeSystemActions = false } = props;

  const queryFn = () => {
    return fetchConnectors({ http, includeSystemActions });
  };

  const { data, isLoading, isFetching, isInitialLoading } = useQuery({
    queryKey: ['useLoadConnectors', includeSystemActions],
    queryFn,
    refetchOnWindowFocus: false,
  });

  return {
    data,
    isInitialLoading,
    isLoading: isLoading || isFetching,
  };
};
