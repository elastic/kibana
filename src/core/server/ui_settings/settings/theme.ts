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

export const getThemeSettings = (): Record<string, UiSettingsParams> => {
  return {
    'theme:darkMode': {
      name: i18n.translate('core.ui_settings.params.darkModeTitle', {
        defaultMessage: 'Dark mode',
      }),
      value: false,
      description: i18n.translate('core.ui_settings.params.darkModeText', {
        defaultMessage: `Enable a dark mode for the Kibana UI. A page refresh is required for the setting to be applied.`,
      }),
      requiresPageReload: true,
      schema: schema.boolean(),
    },
    'theme:version': {
      name: i18n.translate('core.ui_settings.params.themeVersionTitle', {
        defaultMessage: 'Theme version',
      }),
      value: 'v7',
      type: 'select',
      options: ['v7', 'v8 (beta)'],
      description: i18n.translate('core.ui_settings.params.themeVersionText', {
        defaultMessage: `Switch between the theme used for the current and next version of Kibana. A page refresh is required for the setting to be applied.`,
      }),
      requiresPageReload: true,
      schema: schema.oneOf([schema.literal('v7'), schema.literal('v8 (beta)')]),
    },
  };
};
