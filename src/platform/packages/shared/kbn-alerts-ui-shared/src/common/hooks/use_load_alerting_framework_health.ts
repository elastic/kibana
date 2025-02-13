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
import { fetchAlertingFrameworkHealth } from '../apis/fetch_alerting_framework_health';

export interface UseLoadAlertingFrameworkHealthProps {
  http: HttpStart;
}

export const useLoadAlertingFrameworkHealth = (props: UseLoadAlertingFrameworkHealthProps) => {
  const { http } = props;

  const queryFn = () => {
    return fetchAlertingFrameworkHealth({ http });
  };

  const { data, isSuccess, isFetching, isLoading, isInitialLoading, isError, error } = useQuery({
    queryKey: ['useLoadAlertingFrameworkHealth'],
    queryFn,
    refetchOnWindowFocus: false,
  });

  return {
    data,
    isLoading: isLoading || isFetching,
    isInitialLoading,
    isSuccess,
    isError,
    error,
  };
};
