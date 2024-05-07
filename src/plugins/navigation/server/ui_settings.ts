/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '@kbn/core/types';
import { i18n } from '@kbn/i18n';

import { ENABLE_SOLUTION_NAV_UI_SETTING_ID } from '../common/constants';
import { NavigationConfig } from './config';

const categoryLabel = i18n.translate('navigation.uiSettings.categoryLabel', {
  defaultMessage: 'Technical preview',
});

/**
 * uiSettings definitions for Navigation
 */
export const getUiSettings = (config: NavigationConfig): Record<string, UiSettingsParams> => {
  return {
    [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: {
      category: [categoryLabel],
      name: i18n.translate('navigation.uiSettings.enableSolutionNav.name', {
        defaultMessage: 'Enable solution navigation',
      }),
      description: i18n.translate('navigation.uiSettings.enableSolutionNav.description', {
        defaultMessage: 'Let users opt in or out from the new solution navigation experience.',
      }),
      schema: schema.boolean(),
      value: config.solutionNavigation.enabled,
      order: 1,
    },
  };
};
