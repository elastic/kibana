/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import React, { useMemo } from 'react';

import { EuiListGroupItem } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  DashboardLocatorParams,
  getDashboardLocatorParamsFromEmbeddable,
} from '@kbn/dashboard-plugin/public';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
import {
  DashboardDrilldownOptions,
  DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
} from '@kbn/presentation-util-plugin/public';
import type { HasParentApi, PublishesUnifiedSearch } from '@kbn/presentation-publishing';

import {
  DASHBOARD_LINK_TYPE,
  LinksLayoutType,
  LINKS_VERTICAL_LAYOUT,
} from '../../../common/content_management';
import { trackUiMetric } from '../../services/kibana_services';
import { DashboardLinkStrings } from './dashboard_link_strings';
import { LinksApi, ResolvedLink } from '../../react_embeddable/types';

export const DashboardLinkComponent = ({
  link,
  layout,
  api,
}: {
  link: ResolvedLink;
  layout: LinksLayoutType;
  api: LinksApi;
}) => {
  const dashboardContainer = api.parentApi as DashboardContainer;
  const parentDashboardId = dashboardContainer.getDashboardSavedObjectId();

  /**
   * Returns the title and description of the dashboard that the link points to; note that, if the link points to
   * the current dashboard, then we need to get the most up-to-date information via the `parentDashboardInput` - this
   * will respond to changes so that the link label/tooltip remains in sync with the dashboard title/description.
   */
  const [dashboardTitle, dashboardDescription] = useMemo(() => {
    return link.destination === parentDashboardId
      ? [dashboardContainer.getTitle(), dashboardContainer.getDescription()]
      : [link.label ?? link.title, link.description];
  }, [link, parentDashboardId, dashboardContainer]);

  const { tooltipTitle, tooltipMessage } = useMemo(() => {
    if (link.error) {
      return {
        tooltipTitle: DashboardLinkStrings.getDashboardErrorLabel(),
        tooltipMessage: link.error.message,
      };
    }
    return {
      tooltipTitle: Boolean(dashboardDescription) ? dashboardTitle : undefined,
      tooltipMessage: dashboardDescription || dashboardTitle,
    };
  }, [link, dashboardTitle, dashboardDescription]);

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
      ...getDashboardLocatorParamsFromEmbeddable(
        api as Partial<PublishesUnifiedSearch & HasParentApi<Partial<PublishesUnifiedSearch>>>,
        linkOptions
      ),
    };

    const locator = dashboardContainer.locator;
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
  }, [link, parentDashboardId, api, dashboardContainer.locator]);

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
      label={dashboardTitle}
      external={link.options?.openInNewTab}
      data-test-subj={link.error ? `${id}--error` : `${id}`}
      aria-current={link.destination === parentDashboardId}
    />
  );
};
