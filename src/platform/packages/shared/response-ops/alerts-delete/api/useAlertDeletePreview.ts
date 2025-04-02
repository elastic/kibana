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
import { useState, useEffect, useRef } from 'react';
import debounce from 'lodash/debounce';
import type { AlertDeletePreviewResponse } from '@kbn/alerting-plugin/common/routes/alert_delete';
import { BASE_ALERTING_API_PATH } from '../constants';

interface AlertDeletePreviewParams {
  http: HttpStart;
  isActiveAlertDeleteEnabled: boolean;
  isInactiveAlertDeleteEnabled: boolean;
  activeAlertDeleteThreshold: number;
  inactiveAlertDeleteThreshold: number;
  categoryIds?: string[];
  spaceIds?: string[];
}
export const alertDeletePreview = async ({
  http,
  isActiveAlertDeleteEnabled,
  isInactiveAlertDeleteEnabled,
  activeAlertDeleteThreshold,
  inactiveAlertDeleteThreshold,
}: AlertDeletePreviewParams) => {
  const params = new URLSearchParams({
    isActiveAlertDeleteEnabled: String(isActiveAlertDeleteEnabled),
    isInactiveAlertDeleteEnabled: String(isInactiveAlertDeleteEnabled),
    activeAlertDeleteThreshold: String(activeAlertDeleteThreshold),
    inactiveAlertDeleteThreshold: String(inactiveAlertDeleteThreshold),
  });

  const { affected_alert_count: affectedAlertCount } = await http.get<AlertDeletePreviewResponse>(
    `${BASE_ALERTING_API_PATH}/rules/settings/_alert_delete_preview?${params.toString()}`
  );

  return { affectedAlertCount };
};

export const useAlertDeletePreview = ({
  http,
  isActiveAlertDeleteEnabled,
  isInactiveAlertDeleteEnabled,
  activeAlertDeleteThreshold,
  inactiveAlertDeleteThreshold,
}: AlertDeletePreviewParams) => {
  const [stableParams, setStableParams] = useState({
    isActiveAlertDeleteEnabled,
    isInactiveAlertDeleteEnabled,
    activeAlertDeleteThreshold,
    inactiveAlertDeleteThreshold,
  });

  const updateStableParams = useRef(
    debounce((params) => {
      setStableParams(params);
    }, 500)
  ).current;

  useEffect(() => {
    updateStableParams({
      isActiveAlertDeleteEnabled,
      isInactiveAlertDeleteEnabled,
      activeAlertDeleteThreshold,
      inactiveAlertDeleteThreshold,
    });

    return () => {
      updateStableParams.cancel();
    };
  }, [
    isActiveAlertDeleteEnabled,
    isInactiveAlertDeleteEnabled,
    activeAlertDeleteThreshold,
    inactiveAlertDeleteThreshold,
    updateStableParams,
  ]);

  const key = [
    'alertDeletePreview',
    stableParams.isActiveAlertDeleteEnabled,
    stableParams.isInactiveAlertDeleteEnabled,
    stableParams.activeAlertDeleteThreshold,
    stableParams.inactiveAlertDeleteThreshold,
  ];

  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      return alertDeletePreview({
        http,
        isActiveAlertDeleteEnabled: stableParams.isActiveAlertDeleteEnabled,
        isInactiveAlertDeleteEnabled: stableParams.isInactiveAlertDeleteEnabled,
        activeAlertDeleteThreshold: stableParams.activeAlertDeleteThreshold,
        inactiveAlertDeleteThreshold: stableParams.inactiveAlertDeleteThreshold,
      });
    },
    enabled: stableParams.isActiveAlertDeleteEnabled || stableParams.isInactiveAlertDeleteEnabled,
  });

  return { affectedAlertsCount: data?.affectedAlertCount ?? 0 };
};
