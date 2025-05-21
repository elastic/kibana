/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import {
  SHELL_TAB_ID,
  HISTORY_TAB_ID,
  CONFIG_TAB_ID,
  SHELL_TOUR_STEP,
  CONFIG_TOUR_STEP,
  HISTORY_TOUR_STEP,
} from './constants';

interface Props {
  selectedTab: string;
  setSelectedTab: (id: string) => void;
}

export function getTopNavConfig({ selectedTab, setSelectedTab }: Props) {
  return [
    {
      id: SHELL_TAB_ID,
      label: i18n.translate('console.topNav.shellTabLabel', {
        defaultMessage: 'Shell',
      }),
      description: i18n.translate('console.topNav.shellTabDescription', {
        defaultMessage: 'Shell',
      }),
      onClick: () => {
        setSelectedTab(SHELL_TAB_ID);
      },
      testId: 'consoleShellButton',
      isSelected: selectedTab === SHELL_TAB_ID,
      tourStep: SHELL_TOUR_STEP,
    },
    {
      id: HISTORY_TAB_ID,
      label: i18n.translate('console.topNav.historyTabLabel', {
        defaultMessage: 'History',
      }),
      description: i18n.translate('console.topNav.historyTabDescription', {
        defaultMessage: 'History',
      }),
      onClick: () => {
        setSelectedTab(HISTORY_TAB_ID);
      },
      testId: 'consoleHistoryButton',
      isSelected: selectedTab === HISTORY_TAB_ID,
      tourStep: HISTORY_TOUR_STEP,
    },
    {
      id: CONFIG_TAB_ID,
      label: i18n.translate('console.topNav.configTabLabel', {
        defaultMessage: 'Config',
      }),
      description: i18n.translate('console.topNav.configTabDescription', {
        defaultMessage: 'Config',
      }),
      onClick: () => {
        setSelectedTab(CONFIG_TAB_ID);
      },
      testId: 'consoleConfigButton',
      isSelected: selectedTab === CONFIG_TAB_ID,
      tourStep: CONFIG_TOUR_STEP,
    },
  ];
}
