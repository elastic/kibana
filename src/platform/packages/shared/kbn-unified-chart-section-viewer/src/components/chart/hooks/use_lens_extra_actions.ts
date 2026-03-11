/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { useMemo } from 'react';
import {
  ACTION_COPY_TO_DASHBOARD,
  ACTION_VIEW_DETAILS,
  ACTION_EXPLORE_IN_DISCOVER_TAB,
} from '../../../common/constants';

interface ActionEventHandler {
  onClick: () => void;
}

interface UseLensExtraActions {
  copyToDashboard?: ActionEventHandler;
  viewDetails?: ActionEventHandler;
  exploreInDiscoverTab?: ActionEventHandler;
}
export const useLensExtraActions = (config: UseLensExtraActions): Action[] => {
  const extraActions = useMemo(() => {
    const actions: Action[] = [];

    if (config.copyToDashboard?.onClick) {
      actions.push(getCopyToDashboardAction(config.copyToDashboard.onClick));
    }

    if (config.viewDetails?.onClick) {
      actions.push(getViewDetailsAction(config.viewDetails.onClick));
    }

    if (config.exploreInDiscoverTab?.onClick) {
      actions.push(getExploreInDiscoverTabAction(config.exploreInDiscoverTab.onClick));
    }

    return actions;
  }, [
    config.copyToDashboard?.onClick,
    config.viewDetails?.onClick,
    config.exploreInDiscoverTab?.onClick,
  ]);

  return extraActions;
};

const getViewDetailsAction = (onExecute: () => void): Action => {
  return {
    id: ACTION_VIEW_DETAILS,
    order: 2,
    type: 'actionButton',
    getDisplayName() {
      return i18n.translate('metricsExperience.lens.actions.viewDetails', {
        defaultMessage: 'View details',
      });
    },
    getIconType() {
      return 'eye';
    },
    async isCompatible() {
      return true;
    },
    async execute() {
      onExecute();
    },
  };
};

// This action is rendered in context menu
// ACTION_EXPLORE_CHART_DISCOVER_TAB is included in QUICK_ACTIONS_IDS
const getExploreInDiscoverTabAction = (onExecute: () => void): Action => {
  return {
    id: ACTION_EXPLORE_IN_DISCOVER_TAB,
    order: 20, // same position as ACTION_OPEN_IN_DISCOVER action
    type: 'actionButton',
    getDisplayName() {
      return i18n.translate('metricsExperience.lens.actions.exploreInDiscoverTab', {
        defaultMessage: 'Explore',
      });
    },
    getIconType() {
      return 'discoverApp';
    },
    async isCompatible() {
      return true;
    },
    async execute() {
      onExecute();
    },
  };
};

const getCopyToDashboardAction = (onExecute: () => void): Action => {
  return {
    id: ACTION_COPY_TO_DASHBOARD,
    order: 1,
    type: 'actionButton',
    getDisplayName() {
      return i18n.translate('metricsExperience.lens.actions.copyToDashboard', {
        defaultMessage: 'Copy to dashboard',
      });
    },
    getIconType() {
      return 'dashboardApp';
    },
    async isCompatible() {
      return true;
    },
    async execute() {
      onExecute();
    },
  };
};
