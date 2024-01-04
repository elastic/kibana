/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const i18nTexts = {
  advancedSettingsTitle: i18n.translate('management.settings.advancedSettingsLabel', {
    defaultMessage: 'Advanced Settings',
  }),
  defaultSpaceTabTitle: i18n.translate('management.settings.spaceSettingsTabTitle', {
    defaultMessage: 'Space Settings',
  }),
  defaultSpaceCalloutTitle: i18n.translate('management.settings.defaultSpaceCalloutTitle', {
    defaultMessage: 'Changes will affect the current space.',
  }),
  defaultSpaceCalloutSubtitle: i18n.translate('management.settings.defaultSpaceCalloutSubtitle', {
    defaultMessage:
      'Changes will only be applied to the current space. These settings are intended for advanced users, as improper configurations may adversely affect aspects of Kibana.',
  }),
  globalTabTitle: i18n.translate('management.settings.globalSettingsTabTitle', {
    defaultMessage: 'Global Settings',
  }),
  globalCalloutTitle: i18n.translate('management.settings.globalCalloutTitle', {
    defaultMessage: 'Changes will affect all user settings across all spaces',
  }),
  globalCalloutSubtitle: i18n.translate('management.settings.globalCalloutSubtitle', {
    defaultMessage:
      'Changes will be applied to all users across all spaces. This includes both native Kibana users and single-sign on users.',
  }),
};
