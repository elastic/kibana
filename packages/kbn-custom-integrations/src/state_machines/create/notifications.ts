/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomIntegrationOptions } from '../../types';
import { CreateCustomIntegrationContext } from './types';

export type CreateCustomIntegrationNotificationEvent =
  | {
      type: 'INTEGRATION_CREATED';
      fields: CustomIntegrationOptions;
    }
  | {
      type: 'CREATE_INITIALIZED';
    };

export const CreateIntegrationNotificationEventSelectors = {
  integrationCreated: (context: CreateCustomIntegrationContext) =>
    ({
      type: 'INTEGRATION_CREATED',
      fields: context.fields,
    } as CreateCustomIntegrationNotificationEvent),
  initialized: () =>
    ({
      type: 'CREATE_INITIALIZED',
    } as CreateCustomIntegrationNotificationEvent),
};
