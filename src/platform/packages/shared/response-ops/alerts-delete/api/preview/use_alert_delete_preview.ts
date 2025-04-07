/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import debounce from 'lodash/debounce';
import type { HttpStart } from '@kbn/core-http-browser';
import type { RulesSettingsAlertDeleteProperties } from '@kbn/alerting-types/rule_settings';
import { alertDeletePreviewApiCall } from './api_call';

type UseAlertDeletePreviewParams = RulesSettingsAlertDeleteProperties & {
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
  const [stableParams, setStableParams] = useState({
    isActiveAlertDeleteEnabled,
    isInactiveAlertDeleteEnabled,
    activeAlertDeleteThreshold,
    inactiveAlertDeleteThreshold,
    categoryIds,
  });

  // Will allow users to change the params without calling the API
  // on each update. Instead, it will wait for 500ms after the last change.
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
      categoryIds,
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
    categoryIds,
  ]);

  const key = ['alertDeletePreview', stableParams];

  const { data } = useQuery({
    queryKey: key,
    queryFn: () => {
      return alertDeletePreviewApiCall({
        services: { http },
        requestQuery: stableParams,
      });
    },
    enabled: stableParams.isActiveAlertDeleteEnabled || stableParams.isInactiveAlertDeleteEnabled,
  });

  return { affectedAlertsCount: data?.affectedAlertCount ?? 0 };
};
