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
import { fetchUiConfig } from '../apis/fetch_ui_config';

export interface UseLoadUiConfigProps {
  http: HttpStart;
}

export const useLoadUiConfig = (props: UseLoadUiConfigProps) => {
  const { http } = props;

  const queryFn = () => {
    return fetchUiConfig({ http });
  };

  const { data, isSuccess, isLoading, isFetching, isInitialLoading, isError, error } = useQuery({
    queryKey: ['useLoadUiConfig'],
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
