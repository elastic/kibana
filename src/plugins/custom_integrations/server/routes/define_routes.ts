/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from '@kbn/core/server';
import { CustomIntegrationRegistry } from '../custom_integration_registry';
import {
  ROUTES_APPEND_CUSTOM_INTEGRATIONS,
  ROUTES_REPLACEMENT_CUSTOM_INTEGRATIONS,
} from '../../common';

export function defineRoutes(
  router: IRouter,
  customIntegrationsRegistry: CustomIntegrationRegistry
) {
  router.get(
    {
      path: ROUTES_APPEND_CUSTOM_INTEGRATIONS,
      validate: false,
    },
    async (context, request, response) => {
      const integrations = customIntegrationsRegistry.getAppendCustomIntegrations();
      return response.ok({
        body: integrations,
      });
    }
  );

  router.get(
    {
      path: ROUTES_REPLACEMENT_CUSTOM_INTEGRATIONS,
      validate: false,
    },
    async (context, request, response) => {
      const integrations = customIntegrationsRegistry.getReplacementCustomIntegrations();
      return response.ok({
        body: integrations,
      });
    }
  );
}
