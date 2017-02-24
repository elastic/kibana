import React from 'react';

import { DashboardConstants } from '../dashboard_constants';
import { PromptForItems } from 'ui_framework/components';

export function DashboardItemPrompt() {
  return <PromptForItems
    singularType={DashboardConstants.TYPE_NAME}
    pluralType={DashboardConstants.TYPE_NAME_PLURAL}
    addHref={'#' + DashboardConstants.CREATE_NEW_DASHBOARD_URL}/>;
}
