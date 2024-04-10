/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import React, { useEffect, useMemo, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import useObservable from 'react-use/lib/useObservable';

import { EuiButtonEmpty, EuiListGroupItem } from '@elastic/eui';
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
  Link,
  LinksLayoutType,
  LINKS_VERTICAL_LAYOUT,
} from '../../../common/content_management';
import { trackUiMetric } from '../../services/kibana_services';
import { useLinks } from '../links_hooks';
import { DashboardLinkStrings } from './dashboard_link_strings';
import { fetchDashboard } from './dashboard_link_tools';

export const DashboardLinkComponent = ({
  link,
  layout,
  onLoading,
  onRender,
}: {
  link: Link;
  layout: LinksLayoutType;
  onLoading: () => void;
  onRender: () => void;
}) => {
  const linksEmbeddable = useLinks();
  const [error, setError] = useState<Error | undefined>();

  const dashboardContainer = linksEmbeddable.parent as DashboardContainer;
  const parentDashboardInput = useObservable(dashboardContainer.getInput$());
  const parentDashboardId = dashboardContainer.select((state) => state.componentState.lastSavedId);

  /** Fetch the dashboard that the link is pointing to */
  const { loading: loadingDestinationDashboard, value: destinationDashboard } =
    useAsync(async () => {
      if (link.id !== parentDashboardId && link.destination) {
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
   * Memoized link information
   */
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
      tooltipTitle: Boolean(dashboardDescription) ? linkLabel : undefined,
      tooltipMessage: dashboardDescription || linkLabel,
    };
  }, [error, linkLabel, dashboardDescription]);

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
        linksEmbeddable as Partial<
          PublishesUnifiedSearch & HasParentApi<Partial<PublishesUnifiedSearch>>
        >,
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
  }, [link, dashboardContainer.locator, linksEmbeddable, parentDashboardId]);

  useEffect(() => {
    if (loadingDestinationDashboard) {
      onLoading();
    } else {
      onRender();
    }
  }, [link, linksEmbeddable, loadingDestinationDashboard, onLoading, onRender]);

  const id = `dashboardLink--${link.id}`;

  return loadingDestinationDashboard ? (
    <li id={`${id}--loading`}>
      <EuiButtonEmpty size="s" isLoading={true} data-test-subj={`${id}--loading`}>
        {DashboardLinkStrings.getLoadingDashboardLabel()}
      </EuiButtonEmpty>
    </li>
  ) : (
    <EuiListGroupItem
      size="s"
      color="text"
      {...onClickProps}
      id={`dashboardLink--${link.id}`}
      showToolTip={true}
      toolTipProps={{
        title: tooltipTitle,
        content: tooltipMessage,
        position: layout === LINKS_VERTICAL_LAYOUT ? 'right' : 'bottom',
        repositionOnScroll: true,
        delay: 'long',
        'data-test-subj': `${id}--tooltip`,
      }}
      iconType={error ? 'warning' : undefined}
      iconProps={{ className: 'dashboardLinkIcon' }}
      isDisabled={Boolean(error)}
      className={classNames('linksPanelLink', {
        linkCurrent: link.destination === parentDashboardId,
        dashboardLinkError: Boolean(error),
        'dashboardLinkError--noLabel': !link.label,
      })}
      label={linkLabel}
      external={link.options?.openInNewTab}
      data-test-subj={error ? `${id}--error` : `${id}`}
      aria-current={link.destination === parentDashboardId}
    />
  );
};
