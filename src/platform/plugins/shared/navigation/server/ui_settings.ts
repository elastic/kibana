/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '@kbn/core/types';
import { i18n } from '@kbn/i18n';
import { isRelativeUrl } from '@kbn/std';

import { DEFAULT_ROUTE_UI_SETTING_ID, DEFAULT_ROUTES } from '../common/constants';
import { NavigationServerStartDependencies } from './types';

/**
 * uiSettings definitions for Navigation
 */
export const getUiSettings = (
  core: CoreSetup<NavigationServerStartDependencies>,
  logger: Logger
): Record<string, UiSettingsParams> => {
  return {
    [DEFAULT_ROUTE_UI_SETTING_ID]: {
      name: i18n.translate('navigation.ui_settings.params.defaultRoute.defaultRouteTitle', {
        defaultMessage: 'Default route',
      }),
      getValue: async ({ request }: { request?: KibanaRequest } = {}) => {
        const [_, { spaces }] = await core.getStartServices();

        if (!spaces || !request) {
          return DEFAULT_ROUTES.classic;
        }

        try {
          if (!request.auth.isAuthenticated) return DEFAULT_ROUTES.classic;

          const activeSpace = await spaces.spacesService.getActiveSpace(request);

          const solution = activeSpace?.solution ?? 'classic';
          return DEFAULT_ROUTES[solution] ?? DEFAULT_ROUTES.classic;
        } catch (e) {
          logger.error(`Failed to retrieve active space: ${e.message}`);
          return DEFAULT_ROUTES.classic;
        }
      },
      schema: schema.string({
        validate(value) {
          if (!value.startsWith('/') || !isRelativeUrl(value)) {
            return i18n.translate(
              'navigation.uiSettings.defaultRoute.defaultRouteIsRelativeValidationMessage',
              {
                defaultMessage: 'Must be a relative URL.',
              }
            );
          }
        },
      }),
      description: i18n.translate('navigation.uiSettings.defaultRoute.defaultRouteText', {
        defaultMessage:
          'This setting specifies the default route when opening Kibana. ' +
          'You can use this setting to modify the landing page when opening Kibana. ' +
          'The route must be a relative URL.',
      }),
    },
  };
};
