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
import type { RulesSettingsAlertDeletion } from '@kbn/alerting-types/rule_settings';
import { fetchAlertDeletionPreview } from '../../apis/alert_deletion_preview';

interface Props {
  http: HttpStart;
  enabled: boolean;
  onSuccess?: (settings: RulesSettingsAlertDeletion) => void;
}
export const useFetchAlertsDeletionPreview = (props: Props) => {
  const { http, enabled, onSuccess } = props;

  const queryFn = () => {
    return fetchAlertDeletionPreview({ http });
  };

  const { data, isFetching, isError, isLoadingError, isLoading, isInitialLoading } = useQuery({
    queryKey: ['fetchAlertDeletionPreview'],
    queryFn,
    onSuccess,
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });

  return {
    isInitialLoading,
    isLoading: (isLoading || isFetching) && enabled,
    isError: isError || isLoadingError,
    data,
  };
};
