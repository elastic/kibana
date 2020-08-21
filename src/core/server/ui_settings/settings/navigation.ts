/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { UiSettingsParams } from '../../../types';
import { isRelativeUrl } from '../../../utils';

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
    pageNavigation: {
      name: i18n.translate('core.ui_settings.params.pageNavigationName', {
        defaultMessage: 'Side nav style',
      }),
      value: 'modern',
      description: i18n.translate('core.ui_settings.params.pageNavigationDesc', {
        defaultMessage: 'Change the style of navigation',
      }),
      type: 'select',
      options: ['modern', 'legacy'],
      optionLabels: {
        modern: i18n.translate('core.ui_settings.params.pageNavigationModern', {
          defaultMessage: 'Modern',
        }),
        legacy: i18n.translate('core.ui_settings.params.pageNavigationLegacy', {
          defaultMessage: 'Legacy',
        }),
      },
      schema: schema.oneOf([schema.literal('modern'), schema.literal('legacy')]),
    },
  };
};
