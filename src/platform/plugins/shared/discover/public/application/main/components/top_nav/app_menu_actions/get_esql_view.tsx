/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ComponentType } from 'react';
import { i18n } from '@kbn/i18n';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { DiscoverAppMenuItemType } from '@kbn/discover-utils';
import { AppMenuActionId } from '@kbn/discover-utils';
import type { CreateEditEsqlViewFlyoutProps } from '@kbn/esql-views-plugin/public';
import type { DiscoverServices } from '../../../../../build_services';
import type { DiscoverInternalState } from '../../../state_management/redux';
import { selectTab } from '../../../state_management/redux';

const getManageEsqlViewsUrl = (services: DiscoverServices): string =>
  services.application.getUrlForApp('management', { path: '/kibana/esqlViews' });

/**
 * Entry point into the `esql_views` plugin's create flow (V2 flyout), pre-filled with the
 * ES|QL query currently written in Discover's query bar. Only registered by `use_top_nav_links`
 * when Discover is in ES|QL mode and the (optional, exploratory) `esqlViews` plugin is enabled.
 */
export const getCreateEsqlViewAppMenuItem = ({
  CreateEsqlViewFlyout,
  services,
  tabId,
  getState,
}: {
  CreateEsqlViewFlyout: ComponentType<CreateEditEsqlViewFlyoutProps>;
  services: DiscoverServices;
  tabId: string;
  getState: () => DiscoverInternalState;
}): DiscoverAppMenuItemType => {
  return {
    id: AppMenuActionId.createEsqlView,
    order: 12,
    label: i18n.translate('discover.localMenu.createEsqlViewTitle', {
      defaultMessage: 'Create ES|QL view',
    }),
    iconType: 'save',
    testId: 'discoverCreateEsqlViewButton',
    render: ({ context: { onFinishAction } }) => {
      const { query } = selectTab(getState(), tabId).appState;
      const initialQuery = isOfAggregateQueryType(query) ? query.esql : undefined;

      return (
        <CreateEsqlViewFlyout
          mode="create"
          initialQuery={initialQuery}
          manageViewsUrl={getManageEsqlViewsUrl(services)}
          core={services.core}
          http={services.http}
          data={services.data}
          notifications={services.notifications}
          onClose={onFinishAction}
          onSaved={() => {}}
        />
      );
    },
  };
};
