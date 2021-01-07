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

export const getNotificationsSettings = (): Record<string, UiSettingsParams> => {
  return {
    'notifications:banner': {
      name: i18n.translate('core.ui_settings.params.notifications.bannerTitle', {
        defaultMessage: 'Custom banner notification',
      }),
      value: '',
      type: 'markdown',
      description: i18n.translate('core.ui_settings.params.notifications.bannerText', {
        defaultMessage:
          'A custom banner intended for temporary notices to all users. {markdownLink}.',
        description:
          'Part of composite text: core.ui_settings.params.notifications.bannerText + ' +
          'core.ui_settings.params.notifications.banner.markdownLinkText',
        values: {
          markdownLink:
            `<a href="https://help.github.com/articles/basic-writing-and-formatting-syntax/"
            target="_blank" rel="noopener">` +
            i18n.translate('core.ui_settings.params.notifications.banner.markdownLinkText', {
              defaultMessage: 'Markdown supported',
            }) +
            '</a>',
        },
      }),
      category: ['notifications'],
      schema: schema.string(),
    },
    'notifications:lifetime:banner': {
      name: i18n.translate('core.ui_settings.params.notifications.bannerLifetimeTitle', {
        defaultMessage: 'Banner notification lifetime',
      }),
      value: 3000000,
      description: i18n.translate('core.ui_settings.params.notifications.bannerLifetimeText', {
        defaultMessage:
          'The time in milliseconds which a banner notification will be displayed on-screen for. ' +
          'Setting to {infinityValue} will disable the countdown.',
        values: {
          infinityValue: 'Infinity',
        },
      }),
      type: 'number',
      category: ['notifications'],
      schema: schema.oneOf([schema.number({ min: 0 }), schema.literal('Infinity')]),
    },
    'notifications:lifetime:error': {
      name: i18n.translate('core.ui_settings.params.notifications.errorLifetimeTitle', {
        defaultMessage: 'Error notification lifetime',
      }),
      value: 300000,
      description: i18n.translate('core.ui_settings.params.notifications.errorLifetimeText', {
        defaultMessage:
          'The time in milliseconds which an error notification will be displayed on-screen for. ' +
          'Setting to {infinityValue} will disable.',
        values: {
          infinityValue: 'Infinity',
        },
      }),
      type: 'number',
      category: ['notifications'],
      schema: schema.oneOf([schema.number({ min: 0 }), schema.literal('Infinity')]),
    },
    'notifications:lifetime:warning': {
      name: i18n.translate('core.ui_settings.params.notifications.warningLifetimeTitle', {
        defaultMessage: 'Warning notification lifetime',
      }),
      value: 10000,
      description: i18n.translate('core.ui_settings.params.notifications.warningLifetimeText', {
        defaultMessage:
          'The time in milliseconds which a warning notification will be displayed on-screen for. ' +
          'Setting to {infinityValue} will disable.',
        values: {
          infinityValue: 'Infinity',
        },
      }),
      type: 'number',
      category: ['notifications'],
      schema: schema.oneOf([schema.number({ min: 0 }), schema.literal('Infinity')]),
    },
    'notifications:lifetime:info': {
      name: i18n.translate('core.ui_settings.params.notifications.infoLifetimeTitle', {
        defaultMessage: 'Info notification lifetime',
      }),
      value: 5000,
      description: i18n.translate('core.ui_settings.params.notifications.infoLifetimeText', {
        defaultMessage:
          'The time in milliseconds which an information notification will be displayed on-screen for. ' +
          'Setting to {infinityValue} will disable.',
        values: {
          infinityValue: 'Infinity',
        },
      }),
      type: 'number',
      category: ['notifications'],
      schema: schema.oneOf([schema.number({ min: 0 }), schema.literal('Infinity')]),
    },
  };
};
