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

import { EuiButtonEmpty, EuiListGroupItem, EuiText } from '@elastic/eui';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import { fetchDashboard } from './dashboard_link_tools';
import { DashboardLinkStrings } from './dashboard_link_strings';
import { DashboardItem, NavigationEmbeddableLink } from '../../embeddable/types';
import { useNavigationEmbeddable } from '../../embeddable/navigation_embeddable';

export const DashboardLinkComponent = ({ link, ...other }: { link: NavigationEmbeddableLink }) => {
  const navEmbeddable = useNavigationEmbeddable();
  const [errorState, setErrorState] = useState<boolean>(false);

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
        const dashboard: DashboardItem | Error = await fetchDashboard(link.destination).catch(
          (error: Error) => {
            setErrorState(true);
            return error;
          }
        );
        return dashboard;
      }
    }, [link, parentDashboardId]);

  const linkLabel = useMemo(() => {
    return (
      link.label ||
      (link.destination === parentDashboardId
        ? parentDashboardTitle
        : destinationDashboard instanceof Error
        ? destinationDashboard.message
        : destinationDashboard?.attributes.title)
    );
  }, [link, destinationDashboard, parentDashboardId, parentDashboardTitle]);

  return loadingDestinationDashboard ? (
    <li {...other} id={`dashboardLink--${link.id}--loading`}>
      <EuiButtonEmpty size="s" isLoading={true}>
        {DashboardLinkStrings.getLoadingDashboardLabel()}
      </EuiButtonEmpty>
    </li>
  ) : (
    <EuiListGroupItem
      {...other}
      size="s"
      isDisabled={errorState}
      id={`dashboardLink--${link.id}`}
      iconType={errorState ? 'warning' : undefined}
      className={classNames('navigationLink', {
        navigationLinkCurrent: link.destination === parentDashboardId,
      })}
      onClick={
        link.destination === parentDashboardId
          ? undefined
          : () => {
              // TODO: As part of https://github.com/elastic/kibana/issues/154381, connect to drilldown
            }
      }
      label={<EuiText size="s">{linkLabel}</EuiText>}
    />
  );
};
