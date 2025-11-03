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

interface CopyToDashboardActionConfig {
  onClick: () => void;
}
interface ViewDetailsActionConfig {
  onClick: () => void;
}

interface UseLensExtraActions {
  copyToDashboard?: CopyToDashboardActionConfig;
  viewDetails?: ViewDetailsActionConfig;
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

    return actions;
  }, [config.copyToDashboard?.onClick, config.viewDetails?.onClick]);

  return extraActions;
};

const getViewDetailsAction = (onExecute: () => void): Action => {
  return {
    id: 'viewDetails',
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

const getCopyToDashboardAction = (onExecute: () => void): Action => {
  return {
    id: 'copyToDashboard',
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
