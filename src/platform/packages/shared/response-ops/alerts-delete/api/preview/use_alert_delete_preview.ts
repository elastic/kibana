/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import useDebounce from 'react-use/lib/useDebounce';
import type { AlertDeleteParams } from '@kbn/alerting-types/alert_delete_types';
import { getAlertDeletePreview } from './get_alert_delete_preview';

export interface UseAlertDeletePreviewParams {
  isEnabled: boolean;
  services: { http: HttpStart };
  queryParams: AlertDeleteParams;
  lastRun?: string;
}
export const useAlertDeletePreview = ({
  isEnabled,
  services: { http },
  queryParams: { activeAlertDeleteThreshold, inactiveAlertDeleteThreshold, categoryIds },
  lastRun,
}: UseAlertDeletePreviewParams) => {
  const [params, setParams] = useState({
    activeAlertDeleteThreshold,
    inactiveAlertDeleteThreshold,
    categoryIds,
  });

  useDebounce(
    () => {
      setParams({
        activeAlertDeleteThreshold,
        inactiveAlertDeleteThreshold,
        categoryIds,
      });
    },
    500,
    [activeAlertDeleteThreshold, inactiveAlertDeleteThreshold, categoryIds]
  );

  const key = ['alertDeletePreview', params, lastRun];

  return useQuery({
    queryKey: key,
    queryFn: () => {
      return getAlertDeletePreview({
        services: { http },
        requestQuery: params,
      });
    },
    keepPreviousData: true,
    staleTime: 1000 * 60,
    enabled:
      isEnabled &&
      (Boolean(params.activeAlertDeleteThreshold) || Boolean(params.inactiveAlertDeleteThreshold)),
  });
};
