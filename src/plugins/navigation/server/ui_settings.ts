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

import {
  ENABLE_SOLUTION_NAV_UI_SETTING_ID,
  DEFAULT_SOLUTION_NAV_UI_SETTING_ID,
  OPT_IN_STATUS_SOLUTION_NAV_UI_SETTING_ID,
} from '../common/constants';
import { NavigationConfig } from './config';

const optInStatusOptionLabels = {
  visible: i18n.translate('navigation.advancedSettings.optInVisibleStatus', {
    defaultMessage: 'Visible',
  }),
  hidden: i18n.translate('navigation.advancedSettings.optInHiddenStatus', {
    defaultMessage: 'Hidden',
  }),
  ask: i18n.translate('navigation.advancedSettings.optInAskStatus', {
    defaultMessage: 'Ask',
  }),
};

const solutionsOptionLabels = {
  ask: i18n.translate('navigation.advancedSettings.askUserWhichSolution', {
    defaultMessage: 'Ask user to choose a solution',
  }),
  es: i18n.translate('navigation.advancedSettings.searchSolution', {
    defaultMessage: 'Search',
  }),
  oblt: i18n.translate('navigation.advancedSettings.observabilitySolution', {
    defaultMessage: 'Observability',
  }),
  security: i18n.translate('navigation.advancedSettings.securitySolution', {
    defaultMessage: 'Security',
  }),
};

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
        defaultMessage: 'Let users opt in to the new solution navigation experience.',
      }),
      schema: schema.boolean(),
      value: config.solutionNavigation.enabled,
      order: 1,
    },
    [OPT_IN_STATUS_SOLUTION_NAV_UI_SETTING_ID]: {
      category: [categoryLabel],
      description: i18n.translate('navigation.uiSettings.optInStatusSolutionNav.description', {
        defaultMessage: `Define how user will opt-in to the new navigation.
      <ul>
        <li><strong>{visible}:</strong> The new navigation is visible immediately to all user. They will be able to opt-out from their user profile.</li>
        <li><strong>{hidden}:</strong> The new navigation is hidden by default. Users can opt-in from their user profile. No banners are shown.</li>
        <li><strong>{ask}:</strong> Show a banner to the users inviting them to try the new navigation experience.</li>
      </ul>`,
        values: {
          visible: optInStatusOptionLabels.visible,
          hidden: optInStatusOptionLabels.hidden,
          ask: optInStatusOptionLabels.ask,
        },
      }),
      name: i18n.translate('navigation.uiSettings.optInStatusSolutionNav.name', {
        defaultMessage: 'Opt-in behaviour',
      }),
      type: 'select',
      schema: schema.string(),
      value: config.solutionNavigation.optInStatus,
      options: ['visible', 'hidden', 'ask'],
      optionLabels: optInStatusOptionLabels,
      order: 2,
    },
    [DEFAULT_SOLUTION_NAV_UI_SETTING_ID]: {
      category: [categoryLabel],
      description: i18n.translate('navigation.uiSettings.defaultSolutionNav.description', {
        defaultMessage:
          'The default solution to display to the users once they opt-in to the new navigation.',
      }),
      name: i18n.translate('navigation.uiSettings.defaultSolutionNav.name', {
        defaultMessage: 'Default solution',
      }),
      type: 'select',
      schema: schema.string(),
      value: config.solutionNavigation.defaultSolution,
      options: ['ask', 'es', 'oblt', 'security'],
      optionLabels: solutionsOptionLabels,
      order: 2,
    },
  };
};
