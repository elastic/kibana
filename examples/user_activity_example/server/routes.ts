/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, CoreSetup } from '@kbn/core/server';
import { TRACK_ACTION_ROUTE } from '../common';

export function registerRoutes(router: IRouter, core: CoreSetup) {
  router.post(
    {
      path: TRACK_ACTION_ROUTE,
      security: {
        authz: {
          enabled: false,
          reason: 'This route is for demonstration purposes only',
        },
      },
      validate: {},
    },
    async (context, request, response) => {
      // Get the userActivity service from core
      const [coreStart] = await core.getStartServices();

      // Track the user action
      coreStart.userActivity.trackUserAction({
        event: {
          action: 'example_button_click',
          type: 'user',
        },
        object: {
          id: 'example-object-1',
          name: 'Example Object',
          type: 'example',
          tags: ['demo', 'user-activity'],
        },
      });

      return response.ok({
        body: {
          success: true,
          message: 'User action tracked! Check your Kibana logs.',
        },
      });
    }
  );
}
