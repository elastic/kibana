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
import type { RulesSettingsAlertDeleteProperties } from '@kbn/alerting-types/rule_settings';
import useDebounce from 'react-use/lib/useDebounce';
import { alertDeletePreviewApiCall } from './alert_delete_preview_api_call';

export type UseAlertDeletePreviewParams = RulesSettingsAlertDeleteProperties & {
  services: { http: HttpStart };
};
export const useAlertDeletePreview = ({
  services: { http },
  isActiveAlertDeleteEnabled,
  isInactiveAlertDeleteEnabled,
  activeAlertDeleteThreshold,
  inactiveAlertDeleteThreshold,
  categoryIds,
}: UseAlertDeletePreviewParams) => {
  const [params, setParams] = useState({
    isActiveAlertDeleteEnabled,
    isInactiveAlertDeleteEnabled,
    activeAlertDeleteThreshold,
    inactiveAlertDeleteThreshold,
    categoryIds,
  });

  useDebounce(
    () => {
      setParams({
        isActiveAlertDeleteEnabled,
        isInactiveAlertDeleteEnabled,
        activeAlertDeleteThreshold,
        inactiveAlertDeleteThreshold,
        categoryIds,
      });
    },
    500,
    [
      isActiveAlertDeleteEnabled,
      isInactiveAlertDeleteEnabled,
      activeAlertDeleteThreshold,
      inactiveAlertDeleteThreshold,
      categoryIds,
    ]
  );

  const key = ['alertDeletePreview', params];

  const { data } = useQuery({
    queryKey: key,
    queryFn: () => {
      return alertDeletePreviewApiCall({
        services: { http },
        requestQuery: params,
      });
    },
    enabled: params.isActiveAlertDeleteEnabled || params.isInactiveAlertDeleteEnabled,
  });

  return { affectedAlertsCount: data?.affectedAlertCount ?? 0 };
};
