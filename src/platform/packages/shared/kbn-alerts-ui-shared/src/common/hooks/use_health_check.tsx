/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import { useLoadAlertingFrameworkHealth } from './use_load_alerting_framework_health';
import { useLoadUiHealth } from './use_load_ui_health';
import { healthCheckErrors, HealthCheckErrors } from '../apis';

export interface UseHealthCheckProps {
  http: HttpStart;
}

export interface UseHealthCheckResult {
  isLoading: boolean;
  healthCheckError: HealthCheckErrors | null;
}

export interface HealthStatus {
  isRulesAvailable: boolean;
  isSufficientlySecure: boolean;
  hasPermanentEncryptionKey: boolean;
}

export const useHealthCheck = (props: UseHealthCheckProps) => {
  const { http } = props;

  const {
    data: uiHealth,
    isLoading: isLoadingUiHealth,
    isInitialLoading: isInitialLoadingUiHealth,
  } = useLoadUiHealth({ http });

  const {
    data: alertingFrameworkHealth,
    isLoading: isLoadingAlertingFrameworkHealth,
    isInitialLoading: isInitialLoadingAlertingFrameworkHealth,
  } = useLoadAlertingFrameworkHealth({ http });

  const isLoading = useMemo(() => {
    return isLoadingUiHealth || isLoadingAlertingFrameworkHealth;
  }, [isLoadingUiHealth, isLoadingAlertingFrameworkHealth]);

  const isInitialLoading = useMemo(() => {
    return isInitialLoadingUiHealth || isInitialLoadingAlertingFrameworkHealth;
  }, [isInitialLoadingUiHealth, isInitialLoadingAlertingFrameworkHealth]);

  const alertingHealth: HealthStatus | null = useMemo(() => {
    if (isLoading || isInitialLoading || !uiHealth || !alertingFrameworkHealth) {
      return null;
    }
    if (!uiHealth.isRulesAvailable) {
      return {
        ...uiHealth,
        isSufficientlySecure: false,
        hasPermanentEncryptionKey: false,
      };
    }
    return {
      ...uiHealth,
      isSufficientlySecure: alertingFrameworkHealth.isSufficientlySecure,
      hasPermanentEncryptionKey: alertingFrameworkHealth.hasPermanentEncryptionKey,
    };
  }, [isLoading, isInitialLoading, uiHealth, alertingFrameworkHealth]);

  const error = useMemo(() => {
    const {
      isRulesAvailable,
      isSufficientlySecure = false,
      hasPermanentEncryptionKey = false,
    } = alertingHealth || {};

    if (isLoading || isInitialLoading || !alertingHealth) {
      return null;
    }
    if (isSufficientlySecure && hasPermanentEncryptionKey) {
      return null;
    }
    if (!isRulesAvailable) {
      return healthCheckErrors.ALERTS_ERROR;
    }
    if (!isSufficientlySecure && !hasPermanentEncryptionKey) {
      return healthCheckErrors.API_KEYS_AND_ENCRYPTION_ERROR;
    }
    if (!hasPermanentEncryptionKey) {
      return healthCheckErrors.ENCRYPTION_ERROR;
    }
    return healthCheckErrors.API_KEYS_DISABLED_ERROR;
  }, [isLoading, isInitialLoading, alertingHealth]);

  return {
    isLoading,
    isInitialLoading,
    error,
  };
};
