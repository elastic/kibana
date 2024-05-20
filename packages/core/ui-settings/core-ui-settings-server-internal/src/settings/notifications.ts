/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { UiSettingsParams } from '@kbn/core-ui-settings-common';

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
            `<a href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax/"
            target="_blank" rel="noopener">` +
            i18n.translate('core.ui_settings.params.notifications.banner.markdownLinkText', {
              defaultMessage: 'Markdown supported',
            }) +
            '</a>',
        },
      }),
      category: ['notifications'],
      sensitive: true,
      schema: schema.string(),
    },
    'notifications:lifetime:banner': {
      name: i18n.translate('core.ui_settings.params.notifications.bannerLifetimeTitle', {
        defaultMessage: 'Banner notification lifetime',
      }),
      value: 3000000,
      description: i18n.translate('core.ui_settings.params.notifications.bannerLifetimeText', {
        defaultMessage:
          'The time in milliseconds which a banner notification will be displayed on-screen for. ',
      }),
      type: 'number',
      category: ['notifications'],
      schema: schema.oneOf([schema.number({ min: 0 }), schema.literal('Infinity')]), // Setting to 'Infinity' will disable the countdown.
    },
    'notifications:lifetime:error': {
      name: i18n.translate('core.ui_settings.params.notifications.errorLifetimeTitle', {
        defaultMessage: 'Error notification lifetime',
      }),
      value: 300000,
      description: i18n.translate('core.ui_settings.params.notifications.errorLifetimeText', {
        defaultMessage:
          'The time in milliseconds which an error notification will be displayed on-screen for. ',
      }),
      type: 'number',
      category: ['notifications'],
      schema: schema.oneOf([schema.number({ min: 0 }), schema.literal('Infinity')]), // Setting to 'Infinity' will disable
    },
    'notifications:lifetime:warning': {
      name: i18n.translate('core.ui_settings.params.notifications.warningLifetimeTitle', {
        defaultMessage: 'Warning notification lifetime',
      }),
      value: 10000,
      description: i18n.translate('core.ui_settings.params.notifications.warningLifetimeText', {
        defaultMessage:
          'The time in milliseconds which a warning notification will be displayed on-screen for. ',
      }),
      type: 'number',
      category: ['notifications'],
      schema: schema.oneOf([schema.number({ min: 0 }), schema.literal('Infinity')]), // Setting to 'Infinity' will disable
    },
    'notifications:lifetime:info': {
      name: i18n.translate('core.ui_settings.params.notifications.infoLifetimeTitle', {
        defaultMessage: 'Info notification lifetime',
      }),
      value: 5000,
      description: i18n.translate('core.ui_settings.params.notifications.infoLifetimeText', {
        defaultMessage:
          'The time in milliseconds which an information notification will be displayed on-screen for. ',
      }),
      type: 'number',
      category: ['notifications'],
      schema: schema.oneOf([schema.number({ min: 0 }), schema.literal('Infinity')]), // Setting to 'Infinity' will disable
    },
  };
};
