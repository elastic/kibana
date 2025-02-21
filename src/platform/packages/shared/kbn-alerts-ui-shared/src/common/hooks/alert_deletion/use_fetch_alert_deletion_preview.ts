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
import type { RulesSettingsAlertDeletionProperties } from '@kbn/alerting-types/rule_settings';
import { fetchAlertDeletionPreview } from '../../apis/alert_deletion_preview';

interface Props {
  http: HttpStart;
  enabled: boolean;
  settings: RulesSettingsAlertDeletionProperties | undefined;
}
export const useFetchAlertsDeletionPreview = (props: Props) => {
  const { http, enabled, settings } = props;

  const { data, isFetching, isError, isLoadingError } = useQuery({
    enabled: enabled && Boolean(settings),
    queryFn: () => {
      return fetchAlertDeletionPreview({ http, settings: settings! });
    },
    queryKey: ['fetchAlertDeletionPreview'],
    refetchOnWindowFocus: false,
    retry: false,
  });

  return {
    isLoading: isFetching && enabled,
    isValid: !(isError || isLoadingError) && Boolean(data),
    data,
  };
};
