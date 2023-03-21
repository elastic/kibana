/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { isRelativeUrl } from '@kbn/std';
import type { UiSettingsParams } from '@kbn/core-ui-settings-common';

export const getNavigationSettings = (): Record<string, UiSettingsParams> => {
  return {
    defaultRoute: {
      name: i18n.translate('core.ui_settings.params.defaultRoute.defaultRouteTitle', {
        defaultMessage: 'Default route',
      }),
      value: '/app/home',
      schema: schema.string({
        validate(value) {
          if (!value.startsWith('/') || !isRelativeUrl(value)) {
            return i18n.translate(
              'core.ui_settings.params.defaultRoute.defaultRouteIsRelativeValidationMessage',
              {
                defaultMessage: 'Must be a relative URL.',
              }
            );
          }
        },
      }),
      description: i18n.translate('core.ui_settings.params.defaultRoute.defaultRouteText', {
        defaultMessage:
          'This setting specifies the default route when opening Kibana. ' +
          'You can use this setting to modify the landing page when opening Kibana. ' +
          'The route must be a relative URL.',
      }),
    },
  };
};
