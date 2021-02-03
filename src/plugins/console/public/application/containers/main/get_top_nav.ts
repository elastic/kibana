/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

interface Props {
  onClickHistory: () => void;
  onClickSettings: () => void;
  onClickHelp: () => void;
}

export function getTopNavConfig({ onClickHistory, onClickSettings, onClickHelp }: Props) {
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
