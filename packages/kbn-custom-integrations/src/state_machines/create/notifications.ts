/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomIntegrationOptions, IntegrationError } from '../../types';
import { CreateCustomIntegrationContext, CreateCustomIntegrationEvent } from './types';

export type CreateCustomIntegrationNotificationEvent =
  | {
      type: 'INTEGRATION_CREATED';
      fields: CustomIntegrationOptions;
    }
  | {
      type: 'INTEGRATION_CLEANUP';
      integrationName: CustomIntegrationOptions['integrationName'];
    }
  | {
      type: 'INTEGRATION_CLEANUP_FAILED';
      error: IntegrationError;
    }
  | {
      type: 'CREATE_INITIALIZED';
    };

export const CreateIntegrationNotificationEventSelectors = {
  integrationCreated: (
    context: CreateCustomIntegrationContext,
    event: CreateCustomIntegrationEvent
  ) => {
    return 'data' in event && 'integrationName' in event.data && 'datasets' in event.data
      ? ({
          type: 'INTEGRATION_CREATED',
          fields: {
            integrationName: event.data.integrationName,
            datasets: event.data.datasets,
          },
        } as CreateCustomIntegrationNotificationEvent)
      : null;
  },
  integrationCleanup: (
    context: CreateCustomIntegrationContext,
    event: CreateCustomIntegrationEvent
  ) => {
    return 'data' in event && 'integrationName' in event.data
      ? ({
          type: 'INTEGRATION_CLEANUP',
          integrationName: event.data.integrationName,
        } as CreateCustomIntegrationNotificationEvent)
      : null;
  },
  integrationCleanupFailed: (
    context: CreateCustomIntegrationContext,
    event: CreateCustomIntegrationEvent
  ) => {
    return 'data' in event && event.data instanceof IntegrationError
      ? ({
          type: 'INTEGRATION_CLEANUP_FAILED',
          error: event.data,
        } as CreateCustomIntegrationNotificationEvent)
      : null;
  },
  initialized: () =>
    ({
      type: 'CREATE_INITIALIZED',
    } as CreateCustomIntegrationNotificationEvent),
};
