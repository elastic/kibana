/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { IRouter } from '@kbn/core/server';
import { HELLO_WORLD_API_PATH, HELLO_WORLD_LAB_ID } from '../../../../common';
import { isLabInstalled } from '../../../lib/installed_labs';

export const registerHelloWorldRoutes = (router: IRouter) => {
  router.get(
    {
      path: HELLO_WORLD_API_PATH,
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          enabled: false,
          reason: 'Labs installs are enforced per user inside the route handler.',
        },
      },
      validate: false,
    },
    async (context, _request, response) => {
      const installed = await isLabInstalled(context, HELLO_WORLD_LAB_ID);

      if (!installed) {
        return response.forbidden({
          body: {
            message: i18n.translate('labs.helloWorld.installRequiredErrorMessage', {
              defaultMessage: 'Install the Hello world lab before using this API.',
            }),
          },
        });
      }

      const { getHelloWorldResponse } = await import('./get_hello');
      return response.ok({ body: getHelloWorldResponse() });
    }
  );
};
