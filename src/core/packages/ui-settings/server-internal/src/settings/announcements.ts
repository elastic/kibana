/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { UiSettingsParams } from '@kbn/core-ui-settings-common';

export const getAnnouncementsSettings = (): Record<string, UiSettingsParams> => {
  return {
    hideAnnouncements: {
      name: i18n.translate('core.ui_settings.params.hideAnnouncements', {
        defaultMessage: 'Hide announcements',
      }),
      value: false,
      description: i18n.translate('core.ui_settings.params.hideAnnouncementsText', {
        defaultMessage: 'Stop showing messages and tours that highlight new features.',
      }),
      deprecation: {
        message: i18n.translate('core.ui_settings.params.hideAnnouncementsDeprecation', {
          defaultMessage:
            'This setting is deprecated and will be removed in Kibana 10.0. Use the global setting "Hide announcements" instead.',
        }),
        docLinksKey: 'uiSettings',
      },
      schema: schema.boolean(),
    },
  };
};

export const getGlobalAnnouncementsSettings = (): Record<string, UiSettingsParams> => {
  return {
    hideAnnouncements: {
      name: i18n.translate('core.ui_settings.params.hideAnnouncementsGlobal', {
        defaultMessage: 'Hide announcements',
      }),
      value: false,
      description: i18n.translate('core.ui_settings.params.hideAnnouncementsGlobalText', {
        defaultMessage: 'Stop showing messages and tours that highlight new features.',
      }),
      schema: schema.boolean(),
      scope: 'global',
    },
    hideFeedback: {
      name: i18n.translate('core.ui_settings.params.hideFeedback', {
        defaultMessage: 'Hide feedback',
      }),
      value: false,
      description: i18n.translate('core.ui_settings.params.hideFeedbackText', {
        defaultMessage: 'Stop showing elements requesting user feedback.',
      }),
      schema: schema.boolean(),
      scope: 'global',
      readonly: true,
    },
  };
};
