/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from 'src/core/server';
import { CustomIntegrationRegistry } from '../custom_integration_registry';
import { PLUGIN_ID } from '../../common';

export function defineRoutes(
  router: IRouter,
  customIntegrationsRegistry: CustomIntegrationRegistry
) {
  router.get(
    {
      path: `/api/${PLUGIN_ID}/addableCustomIntegrations`,
      validate: false,
    },
    async (context, request, response) => {
      const integrations = customIntegrationsRegistry.getAddableCustomIntegrations();
      return response.ok({
        body: integrations,
      });
    }
  );

  router.get(
    {
      path: `/api/${PLUGIN_ID}/replaceableCustomIntegrations`,
      validate: false,
    },
    async (context, request, response) => {
      const integrations = customIntegrationsRegistry.getReplaceableCustomIntegrations();
      return response.ok({
        body: integrations,
      });
    }
  );
}
