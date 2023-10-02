/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useInterpret } from '@xstate/react';
import createContainer from 'constate';
import type { HttpSetup } from '@kbn/core-http-browser';
import { useEffect, useState } from 'react';
import { isDevMode } from '@kbn/xstate-utils';
import { createCustomIntegrationsStateMachine } from './state_machine';
import { IntegrationsClient } from '../services/integrations_client';
import { CustomIntegrationOptions, IntegrationError } from '../../types';
import { InitialState } from './types';
import { createCustomIntegrationsNotificationChannel } from './notifications';

interface Services {
  http: HttpSetup | undefined;
}

export interface Callbacks {
  onIntegrationCreation?: (integrationOptions: CustomIntegrationOptions) => void;
  onIntegrationCleanup?: (integrationName: CustomIntegrationOptions['integrationName']) => void;
  onIntegrationCleanupFailed?: (error: IntegrationError) => void;
}

type ProviderProps = {
  services: Services;
  useDevTools?: boolean;
  initialState: InitialState;
} & Callbacks;

export const useCustomIntegrationsState = ({
  services,
  useDevTools = isDevMode(),
  onIntegrationCreation,
  onIntegrationCleanup,
  onIntegrationCleanupFailed,
  initialState,
}: ProviderProps) => {
  const { http } = services;

  if (!http)
    throw new Error(
      'Please ensure the HTTP service from Core is provided to the useCustomIntegrations Provider'
    );

  const [integrationsClient] = useState(() => new IntegrationsClient(http));
  const [customIntegrationsNotificationsChannel] = useState(() =>
    createCustomIntegrationsNotificationChannel()
  );
  const [notificationsService] = useState(() =>
    customIntegrationsNotificationsChannel.createService()
  );

  // Provide notifications outside of the state machine context
  useEffect(() => {
    const sub = notificationsService.subscribe((event) => {
      if (event.type === 'INTEGRATION_CREATED' && onIntegrationCreation) {
        onIntegrationCreation(event.fields);
      } else if (event.type === 'INTEGRATION_CLEANUP' && onIntegrationCleanup) {
        onIntegrationCleanup(event.integrationName);
      } else if (event.type === 'INTEGRATION_CLEANUP_FAILED' && onIntegrationCleanupFailed) {
        onIntegrationCleanupFailed(event.error);
      }
    });
    return () => sub.unsubscribe();
  }, [
    notificationsService,
    onIntegrationCleanup,
    onIntegrationCleanupFailed,
    onIntegrationCreation,
  ]);

  const customIntegrationsStateService = useInterpret(
    () =>
      createCustomIntegrationsStateMachine({
        integrationsClient,
        customIntegrationsNotificationsChannel,
        initialState,
      }),
    { devTools: useDevTools }
  );
  return customIntegrationsStateService;
};

export const [CustomIntegrationsProvider, useCustomIntegrationsContext] = createContainer(
  useCustomIntegrationsState
);
