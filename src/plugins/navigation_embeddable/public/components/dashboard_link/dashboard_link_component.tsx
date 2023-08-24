/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import useAsync from 'react-use/lib/useAsync';
import useObservable from 'react-use/lib/useObservable';
import React, { useMemo, useState } from 'react';

import { EuiButtonEmpty, EuiListGroupItem, EuiToolTip } from '@elastic/eui';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import {
  NAV_VERTICAL_LAYOUT,
  NavigationLayoutType,
  NavigationEmbeddableLink,
} from '../../../common/content_management';
import { DashboardLinkStrings } from './dashboard_link_strings';
import { fetchDashboard, navigateToDashboard } from './dashboard_link_tools';
import { useNavigationEmbeddable } from '../../embeddable/navigation_embeddable';

export const DashboardLinkComponent = ({
  link,
  layout,
}: {
  link: NavigationEmbeddableLink;
  layout: NavigationLayoutType;
}) => {
  const navEmbeddable = useNavigationEmbeddable();
  const [error, setError] = useState<Error | undefined>();

  const dashboardContainer = navEmbeddable.parent as DashboardContainer;
  const parentDashboardInput = useObservable(dashboardContainer.getInput$());
  const parentDashboardId = dashboardContainer.select((state) => state.componentState.lastSavedId);

  /** Fetch the dashboard that the link is pointing to */
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

  /**
   * Returns the title and description of the dashboard that the link points to; note that, if the link points to
   * the current dashboard, then we need to get the most up-to-date information via the `parentDashboardInput` - this
   * will respond to changes so that the link label/tooltip remains in sync with the dashboard title/description.
   */
  const [dashboardTitle, dashboardDescription] = useMemo(() => {
    return link.destination === parentDashboardId
      ? [parentDashboardInput?.title, parentDashboardInput?.description]
      : [destinationDashboard?.attributes.title, destinationDashboard?.attributes.description];
  }, [link.destination, parentDashboardId, parentDashboardInput, destinationDashboard]);

  /** Label of the `EuiListGroupItem` for the given link */
  const linkLabel = useMemo(() => {
    return link.label || (dashboardTitle ?? DashboardLinkStrings.getDashboardErrorLabel());
  }, [link, dashboardTitle]);

  /** Tooltip info of the `EuiListGroupItem` for the given link */
  const { tooltipTitle, tooltipMessage } = useMemo(() => {
    if (error) {
      return {
        tooltipTitle: DashboardLinkStrings.getDashboardErrorLabel(),
        tooltipMessage: error.message,
      };
    }
    return {
      tooltipTitle: Boolean(dashboardDescription) ? dashboardTitle : undefined,
      tooltipMessage: dashboardDescription || dashboardTitle,
    };
  }, [error, dashboardTitle, dashboardDescription]);

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
          ? undefined // no `onClick` event should exist if the link points to the current dashboard
          : (event) => {
              navigateToDashboard({
                link,
                navEmbeddable,
                modifiedClick: event.ctrlKey || event.metaKey || event.shiftKey,
              });
            }
      }
      label={
        <EuiToolTip
          delay="long"
          display="block"
          repositionOnScroll
          position={layout === NAV_VERTICAL_LAYOUT ? 'right' : 'bottom'}
          title={tooltipTitle}
          content={tooltipMessage}
        >
          {/* Setting `title=""` so that the native browser tooltip is disabled */}
          <div className="eui-textTruncate" title="">
            {linkLabel}
          </div>
        </EuiToolTip>
      }
    />
  );
};
