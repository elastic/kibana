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
import { RulesSettingsFlapping } from '@kbn/alerting-types/rule_settings';
import { fetchFlappingSettings } from '../apis/fetch_flapping_settings';

interface UseFetchFlappingSettingsProps {
  http: HttpStart;
  enabled: boolean;
  onSuccess?: (settings: RulesSettingsFlapping) => void;
}

export const useFetchFlappingSettings = (props: UseFetchFlappingSettingsProps) => {
  const { http, enabled, onSuccess } = props;

  const queryFn = () => {
    return fetchFlappingSettings({ http });
  };

  const { data, isFetching, isError, isLoadingError, isLoading, isInitialLoading } = useQuery({
    queryKey: ['fetchFlappingSettings'],
    queryFn,
    onSuccess,
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });

  return {
    isInitialLoading,
    isLoading: isLoading || isFetching,
    isError: isError || isLoadingError,
    data,
  };
};
