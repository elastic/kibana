/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

interface Props {
  onClickHistory: () => void;
  onClickSettings: () => void;
  onClickHelp: () => void;
  onClickVariables: () => void;
}

export function getTopNavConfig({
  onClickHistory,
  onClickSettings,
  onClickHelp,
  onClickVariables,
}: Props) {
  return [
    {
      id: 'history',
      label: i18n.translate('console.topNav.historyTabLabel', {
        defaultMessage: 'History',
      }),
      description: i18n.translate('console.topNav.historyTabDescription', {
        defaultMessage: 'History',
      }),
      onClick: () => {
        onClickHistory();
      },
      testId: 'consoleHistoryButton',
    },
    {
      id: 'settings',
      label: i18n.translate('console.topNav.settingsTabLabel', {
        defaultMessage: 'Settings',
      }),
      description: i18n.translate('console.topNav.settingsTabDescription', {
        defaultMessage: 'Settings',
      }),
      onClick: () => {
        onClickSettings();
      },
      testId: 'consoleSettingsButton',
    },
    {
      id: 'variables',
      label: i18n.translate('console.topNav.variablesTabLabel', {
        defaultMessage: 'Variables',
      }),
      description: i18n.translate('console.topNav.variablesTabDescription', {
        defaultMessage: 'Variables',
      }),
      onClick: () => {
        onClickVariables();
      },
      testId: 'consoleVariablesButton',
    },
    {
      id: 'help',
      label: i18n.translate('console.topNav.helpTabLabel', {
        defaultMessage: 'Help',
      }),
      description: i18n.translate('console.topNav.helpTabDescription', {
        defaultMessage: 'Help',
      }),
      onClick: () => {
        onClickHelp();
      },
      testId: 'consoleHelpButton',
    },
  ];
}
