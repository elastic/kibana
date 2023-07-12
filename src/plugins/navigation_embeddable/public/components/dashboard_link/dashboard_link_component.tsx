/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import useAsync from 'react-use/lib/useAsync';

import { EuiButtonEmpty } from '@elastic/eui';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import {
  DASHBOARD_LINK_TYPE,
  NavigationEmbeddableLink,
  NavigationLinkInfo,
} from '../../embeddable/types';
import { memoizedFetchDashboard } from './dashboard_link_tools';
import { useNavigationEmbeddable } from '../../embeddable/navigation_embeddable';

export const DashboardLinkComponent = ({ link }: { link: NavigationEmbeddableLink }) => {
  const navEmbeddable = useNavigationEmbeddable();

  const dashboardContainer = navEmbeddable.parent as DashboardContainer;
  const parentDashboardTitle = dashboardContainer.select((state) => state.explicitInput.title);
  const parentDashboardId = dashboardContainer.select((state) => state.componentState.lastSavedId);

  const { loading: loadingDestinationDashboard, value: destinationDashboard } =
    useAsync(async () => {
      if (!link.label && link.id !== parentDashboardId) {
        /**
         * only fetch the dashboard if **absolutely** necessary; i.e. only if the dashboard link doesn't have
         * some custom label, and if it's not the current dashboard (if it is, use `dashboardContainer` instead)
         */
        return await memoizedFetchDashboard(link.destination);
      }
    }, [link, parentDashboardId]);

  return (
    <EuiButtonEmpty
      isLoading={loadingDestinationDashboard}
      iconType={NavigationLinkInfo[DASHBOARD_LINK_TYPE].icon}
      {...(link.destination === parentDashboardId
        ? {
            color: 'text',
          }
        : {
            color: 'primary',
            onClick: () => {}, // TODO: As part of https://github.com/elastic/kibana/issues/154381, connect to drilldown
          })}
    >
      {link.label ||
        (link.destination === parentDashboardId
          ? parentDashboardTitle
          : destinationDashboard?.attributes.title)}
    </EuiButtonEmpty>
  );
};
