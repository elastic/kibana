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
import useObservable from 'react-use/lib/useObservable';

import {
  DashboardDrilldownOptions,
  DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
} from '@kbn/presentation-util-plugin/public';
import { EuiButtonEmpty, EuiListGroupItem, EuiToolTip } from '@elastic/eui';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import {
  NAV_VERTICAL_LAYOUT,
  NavigationLayoutType,
  NavigationEmbeddableLink,
} from '../../../common/content_management';
import { coreServices } from '../../services/kibana_services';
import { DashboardLinkStrings } from './dashboard_link_strings';
import { useNavigationEmbeddable } from '../../embeddable/navigation_embeddable';
import { fetchDashboard, getDashboardHref, getDashboardLocator } from './dashboard_link_tools';

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

  /**
   * Dashboard-to-dashboard navigation
   */
  const { value: dashboardLocator } = useAsync(async () => {
    return await getDashboardLocator({
      link,
      navEmbeddable,
    });
  }, [link]);

  const dashboardHref = useMemo(() => {
    if (dashboardLocator) {
      return getDashboardHref(dashboardLocator);
    }
  }, [dashboardLocator]);

  /**
   * Memoized link information
   */
  const linkOptions = useMemo(() => {
    return {
      ...DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
      ...link.options,
    } as DashboardDrilldownOptions;
  }, [link.options]);

  const linkLabel = useMemo(() => {
    return link.label || (dashboardTitle ?? DashboardLinkStrings.getDashboardErrorLabel());
  }, [link, dashboardTitle]);

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
      isDisabled={Boolean(error) || !dashboardLocator}
      id={`dashboardLink--${link.id}`}
      iconType={error ? 'warning' : undefined}
      iconProps={{ className: 'dashboardLinkIcon' }}
      className={classNames('navigationLink', {
        navigationLinkCurrent: link.destination === parentDashboardId,
        dashboardLinkError: Boolean(error),
        'dashboardLinkError--noLabel': !link.label,
      })}
      href={dashboardHref}
      onClick={
        link.destination === parentDashboardId
          ? undefined // no `onClick` event should exist if the link points to the current dashboard
          : async (event) => {
              /**
               * If the link is being opened via a new tab (either by modifying the click or due to `openInNewTab`
               * being `true`), then we should use the default `href` navigation behaviour by passing all the dashboard
               * state via the URL - this will keep behaviour consistent across all browsers.
               */
              const modifiedClick = event.ctrlKey || event.metaKey || event.shiftKey;
              if (modifiedClick || linkOptions.openInNewTab) {
                return;
              }

              /** Otherwise, if we're remaining in the current tab, then rely on Core to navigate */
              if (dashboardLocator) {
                // this check should always be true, since the button is disabled otherwise - this is just for type safety
                event.preventDefault();
                const { app, path, state } = dashboardLocator;
                await coreServices.application.navigateToApp(app, {
                  path,
                  state,
                });
              }
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
