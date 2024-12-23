/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React, { useMemo } from 'react';

import { EuiListGroupItem } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import { DashboardLocatorParams } from '@kbn/dashboard-plugin/public';
import {
  DashboardDrilldownOptions,
  DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
} from '@kbn/presentation-util-plugin/public';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import { isFilterPinned, Query } from '@kbn/es-query';
import {
  DASHBOARD_LINK_TYPE,
  LinksLayoutType,
  LINKS_VERTICAL_LAYOUT,
} from '../../../common/content_management';
import { trackUiMetric } from '../../services/kibana_services';
import { DashboardLinkStrings } from './dashboard_link_strings';
import { LinksParentApi, ResolvedLink } from '../../types';

export const DashboardLinkComponent = ({
  link,
  layout,
  parentApi,
}: {
  link: ResolvedLink;
  layout: LinksLayoutType;
  parentApi: LinksParentApi;
}) => {
  const [
    parentDashboardId,
    parentDashboardTitle,
    parentDashboardDescription,
    timeRange,
    filters,
    query,
  ] = useBatchedPublishingSubjects(
    parentApi.savedObjectId,
    parentApi.panelTitle,
    parentApi.panelDescription,
    parentApi.timeRange$,
    parentApi.filters$,
    parentApi.query$
  );

  /**
   * Returns the title and description of the dashboard that the link points to; note that, if the link points to
   * the current dashboard, then we need to get the most up-to-date information via the `parentDashboardInput` - this
   * will respond to changes so that the link label/tooltip remains in sync with the dashboard title/description.
   */
  const [dashboardTitle, dashboardDescription] = useMemo(() => {
    return link.destination === parentDashboardId
      ? [parentDashboardTitle, parentDashboardDescription]
      : [link.title, link.description];
  }, [link, parentDashboardId, parentDashboardTitle, parentDashboardDescription]);

  /**
   * Memoized link information
   */
  const linkLabel = useMemo(() => {
    return link.label || (dashboardTitle ?? DashboardLinkStrings.getDashboardErrorLabel());
  }, [link, dashboardTitle]);

  const { tooltipTitle, tooltipMessage } = useMemo(() => {
    if (link.error) {
      return {
        tooltipTitle: DashboardLinkStrings.getDashboardErrorLabel(),
        tooltipMessage: link.error.message,
      };
    }
    return {
      tooltipTitle: Boolean(dashboardDescription) ? linkLabel : undefined,
      tooltipMessage: dashboardDescription || linkLabel,
    };
  }, [link, linkLabel, dashboardDescription]);

  /**
   * Dashboard-to-dashboard navigation
   */
  const onClickProps = useMemo(() => {
    /** If the link points to the current dashboard, then there should be no `onClick` or `href` prop */
    if (!link.destination || link.destination === parentDashboardId) return;

    const linkOptions = {
      ...DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
      ...link.options,
    } as DashboardDrilldownOptions;

    const params: DashboardLocatorParams = {
      dashboardId: link.destination,
    };
    if (linkOptions.useCurrentFilters && query) {
      params.query = query as Query;
    }

    if (linkOptions.useCurrentDateRange && timeRange) {
      params.timeRange = timeRange;
    }

    params.filters = linkOptions.useCurrentFilters ? filters : filters?.filter(isFilterPinned);

    const locator = parentApi.locator;
    if (!locator) return;

    const href = locator.getRedirectUrl(params);
    return {
      href,
      onClick: async (event: React.MouseEvent) => {
        trackUiMetric?.(METRIC_TYPE.CLICK, `${DASHBOARD_LINK_TYPE}:click`);

        /**
         * If the link is being opened via a modified click, then we should use the default `href` navigation behaviour
         * by passing all the dashboard state via the URL - this will keep behaviour consistent across all browsers.
         */
        const modifiedClick = event.ctrlKey || event.metaKey || event.shiftKey;
        if (modifiedClick) {
          return;
        }

        /** Otherwise, prevent the default behaviour and handle click depending on `openInNewTab` option */
        event.preventDefault();
        if (linkOptions.openInNewTab) {
          window.open(href, '_blank');
        } else {
          await locator.navigate(params);
        }
      },
    };
  }, [
    link.destination,
    link.options,
    parentDashboardId,
    filters,
    parentApi.locator,
    query,
    timeRange,
  ]);

  const id = `dashboardLink--${link.id}`;

  return (
    <EuiListGroupItem
      size="s"
      color="text"
      {...onClickProps}
      id={id}
      showToolTip={true}
      toolTipProps={{
        title: tooltipTitle,
        content: tooltipMessage,
        position: layout === LINKS_VERTICAL_LAYOUT ? 'right' : 'bottom',
        repositionOnScroll: true,
        delay: 'long',
        'data-test-subj': `${id}--tooltip`,
      }}
      iconType={link.error ? 'warning' : undefined}
      iconProps={{ className: 'dashboardLinkIcon' }}
      isDisabled={Boolean(link.error)}
      className={classNames('linksPanelLink', {
        linkCurrent: link.destination === parentDashboardId,
        dashboardLinkError: Boolean(link.error),
        'dashboardLinkError--noLabel': !link.label,
      })}
      label={linkLabel}
      external={link.options?.openInNewTab}
      data-test-subj={link.error ? `${id}--error` : `${id}`}
      aria-current={link.destination === parentDashboardId}
    />
  );
};
