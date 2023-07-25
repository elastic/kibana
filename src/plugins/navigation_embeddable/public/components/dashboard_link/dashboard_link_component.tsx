/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import useAsync from 'react-use/lib/useAsync';
import React, { useMemo, useState } from 'react';

import { EuiButtonEmpty, EuiListGroupItem } from '@elastic/eui';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import { fetchDashboard } from './dashboard_link_tools';
import { DashboardLinkStrings } from './dashboard_link_strings';
import { NavigationEmbeddableLink } from '../../embeddable/types';
import { useNavigationEmbeddable } from '../../embeddable/navigation_embeddable';

export const DashboardLinkComponent = ({ link }: { link: NavigationEmbeddableLink }) => {
  const navEmbeddable = useNavigationEmbeddable();
  const [error, setError] = useState<Error | undefined>();

  const dashboardContainer = navEmbeddable.parent as DashboardContainer;
  const parentDashboardTitle = dashboardContainer.select((state) => state.explicitInput.title);
  const parentDashboardId = dashboardContainer.select((state) => state.componentState.lastSavedId);

  const { loading: loadingDestinationDashboard, value: destinationDashboard } =
    useAsync(async () => {
      if (link.id !== parentDashboardId) {
        /**
         * only fetch the dashboard if it's not the current dashboard - if it is the current dashboard,
         * use `dashboardContainer` and its corresponding state (title, description, etc.) instead.
         */
        const dashboard = await fetchDashboard(link.destination)
          .then((result) => {
            setError(undefined);
            return result;
          })
          .catch((e) => setError(e));
        return dashboard;
      }
    }, [link, parentDashboardId]);

  const linkLabel = useMemo(() => {
    return (
      link.label ||
      (link.destination === parentDashboardId
        ? parentDashboardTitle
        : destinationDashboard?.attributes.title ?? DashboardLinkStrings.getDashboardErrorLabel())
    );
  }, [link, destinationDashboard, parentDashboardId, parentDashboardTitle]);

  return loadingDestinationDashboard ? (
    <li id={`dashboardLink--${link.id}--loading`}>
      <EuiButtonEmpty size="s" isLoading={true}>
        {DashboardLinkStrings.getLoadingDashboardLabel()}
      </EuiButtonEmpty>
    </li>
  ) : (
    <EuiListGroupItem
      size="s"
      color="text"
      showToolTip={Boolean(error)}
      isDisabled={Boolean(error)}
      id={`dashboardLink--${link.id}`}
      iconType={error ? 'warning' : undefined}
      iconProps={{ className: 'dashboardLinkIcon' }}
      className={classNames('navigationLink', {
        navigationLinkCurrent: link.destination === parentDashboardId,
        dashboardLinkError: Boolean(error),
        'dashboardLinkError--noLabel': !link.label,
      })}
      onClick={
        link.destination === parentDashboardId
          ? undefined
          : () => {
              // TODO: As part of https://github.com/elastic/kibana/issues/154381, connect to drilldown
            }
      }
      label={linkLabel}
      toolTipText={error ? error.message : undefined}
    />
  );
};
