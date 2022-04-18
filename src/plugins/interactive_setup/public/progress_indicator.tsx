/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiStepProps } from '@elastic/eui';
import { EuiPanel, EuiSteps } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React, { useEffect, useState } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useTimeoutFn from 'react-use/lib/useTimeoutFn';

import type { IHttpFetchError } from '@kbn/core/public';
import type { StatusResponse } from '@kbn/core/types/status';
import { i18n } from '@kbn/i18n';

import { useKibana } from './use_kibana';

export interface ProgressIndicatorProps {
  onSuccess?(): void;
}

function isKibanaPastPreboot(response?: Response, body?: StatusResponse) {
  if (!response?.headers.get('content-type')?.includes('application/json')) {
    return false;
  }

  return (
    // Status endpoint may require authentication after `preboot` stage.
    response?.status === 401 ||
    // We're only interested in the availability of the critical core services.
    (body?.status?.core?.elasticsearch?.level === 'available' &&
      body?.status?.core?.savedObjects?.level === 'available')
  );
}

export const ProgressIndicator: FunctionComponent<ProgressIndicatorProps> = ({ onSuccess }) => {
  const { http } = useKibana();
  const [status, checkStatus] = useAsyncFn(async () => {
    let isAvailable: boolean | undefined = false;
    let isPastPreboot: boolean | undefined = false;
    try {
      const { response, body } = await http.get<StatusResponse | undefined>('/api/status', {
        asResponse: true,
      });
      isAvailable = response ? response.status < 500 : undefined;
      isPastPreboot = isKibanaPastPreboot(response, body);
    } catch (error) {
      const { response, body = {} } = error as IHttpFetchError;
      isAvailable = response ? response.status < 500 : undefined;
      isPastPreboot = isKibanaPastPreboot(response, body as StatusResponse);
    }
    return isAvailable === true && isPastPreboot
      ? 'complete'
      : isAvailable === false
      ? 'unavailable'
      : isAvailable === true && !isPastPreboot
      ? 'preboot'
      : 'unknown';
  });

  const [, cancelPolling, resetPolling] = useTimeoutFn(checkStatus, 1000);

  useEffect(() => {
    if (status.value === 'complete') {
      cancelPolling();
      onSuccess?.();
    } else if (status.loading === false) {
      resetPolling();
    }
  }, [status.loading, status.value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <EuiPanel color="transparent">
      <LoadingSteps
        currentStepId={status.value}
        steps={[
          {
            id: 'preboot',
            title: i18n.translate('interactiveSetup.progressIndicator.prebootStepTitle', {
              defaultMessage: 'Saving settings',
            }),
          },
          {
            id: 'unavailable',
            title: i18n.translate('interactiveSetup.progressIndicator.unavailableStepTitle', {
              defaultMessage: 'Starting Elastic',
            }),
          },
          {
            id: 'complete',
            title: i18n.translate('interactiveSetup.progressIndicator.completeStepTitle', {
              defaultMessage: 'Completing setup',
            }),
          },
        ]}
      />
    </EuiPanel>
  );
};

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>;

export interface LoadingStepsProps {
  currentStepId?: string;
  steps: Array<Optional<EuiStepProps, 'status' | 'children'>>;
}

export const LoadingSteps: FunctionComponent<LoadingStepsProps> = ({ currentStepId, steps }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const currentStepIndex = steps.findIndex((step) => step.id === currentStepId);

  // Ensure that loading progress doesn't move backwards
  useEffect(() => {
    if (currentStepIndex > stepIndex) {
      setStepIndex(currentStepIndex);
    }
  }, [currentStepIndex, stepIndex]);

  return (
    <EuiSteps
      steps={steps.map((step, i) => ({
        status: i <= stepIndex ? 'complete' : i - 1 === stepIndex ? 'loading' : 'incomplete',
        children: null,
        ...step,
      }))}
    />
  );
};
