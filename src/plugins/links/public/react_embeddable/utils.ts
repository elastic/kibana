/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiListGroupItemProps, EuiToolTipProps } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
import {
  DashboardDrilldownOptions,
  DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
} from '@kbn/presentation-util-plugin/public';
import {
  DEFAULT_URL_DRILLDOWN_OPTIONS,
  UrlDrilldownOptions,
} from '@kbn/ui-actions-enhanced-plugin/public';
import { memoize } from 'lodash';
import {
  DASHBOARD_LINK_TYPE,
  EXTERNAL_LINK_TYPE,
  Link,
  LinksLayoutType,
  LINKS_VERTICAL_LAYOUT,
} from '../../common/content_management';
import { DashboardLinkStrings } from '../components/dashboard_link/dashboard_link_strings';
import { fetchDashboard } from '../components/dashboard_link/dashboard_link_tools';
import { validateUrl } from '../components/external_link/external_link_tools';
import { DashboardItem } from '../embeddable/types';
import { coreServices, trackUiMetric } from '../services/kibana_services';

import { ResolvedLink } from './types';

export const getOrderedLinkList = (links: ResolvedLink[]): ResolvedLink[] => {
  return [...links].sort((linkA, linkB) => {
    return linkA.order - linkB.order;
  });
};

/**
 * Memoizing this prevents the links panel editor from having to unnecessarily calculate this
 * a second time once the embeddable exists - after all, the links component should have already
 * calculated this so, we can get away with using the cached version in the editor
 */
export const memoizedGetOrderedLinkList = memoize(
  (links: ResolvedLink[]) => {
    return getOrderedLinkList(links);
  },
  (links: ResolvedLink[]) => {
    return links;
  }
);

export async function resolveLinks(links: Link[] = []) {
  const resolvedLinkInfos = await Promise.all(
    links.map(async (link) => {
      return { ...link, ...(await resolveLinkInfo(link)) };
    })
  );
  return getOrderedLinkList(resolvedLinkInfos);
  // return await Promise.reject(new Error('boom'));
}

export async function resolveLinkInfo(
  link: Link
): Promise<{ title: string; description?: string; error?: Error }> {
  if (link.type === EXTERNAL_LINK_TYPE) {
    const info = { title: link.label ?? link.destination };
    const { valid, message } = validateUrl(link.destination);
    if (valid) {
      return info;
    }
    return { ...info, error: new Error(message) };
  }
  if (link.type === DASHBOARD_LINK_TYPE) {
    if (!link.destination) return { title: '' };
    try {
      const {
        attributes: { title, description },
      } = await fetchDashboard(link.destination);
      return { title: link.label ?? title, description };
    } catch (error) {
      return { title: DashboardLinkStrings.getDashboardErrorLabel(), error };
    }
  }
  throw new Error('Unsupported link type');
}

const getDefaultToolTipProps = (layout: LinksLayoutType): Partial<EuiToolTipProps> => {
  return {
    position: layout === LINKS_VERTICAL_LAYOUT ? 'right' : 'bottom',
    repositionOnScroll: true,
    delay: 'long',
  };
};

export async function fetchLinkInfos(
  links: Link[],
  parent: DashboardContainer,
  layout: LinksLayoutType
): Promise<Array<Partial<EuiListGroupItemProps>>> {
  return Promise.all(links.map((link) => fetchLinkInfo(link, parent, layout)));
}

export async function fetchLinkInfo(
  link: Link,
  parent: DashboardContainer,
  layout: LinksLayoutType
): Promise<Partial<EuiListGroupItemProps>> {
  if (link.type === EXTERNAL_LINK_TYPE) {
    const { valid, message: error } = validateUrl(link.destination);
    const id = `externalLink--${link.id}`;
    const linkOptions = {
      ...DEFAULT_URL_DRILLDOWN_OPTIONS,
      ...link.options,
    } as UrlDrilldownOptions;
    const destination = linkOptions?.encodeUrl ? encodeURI(link.destination) : link.destination;
    return {
      external: true,
      isDisabled: !valid,
      showToolTip: !valid,
      toolTipProps: {
        ...getDefaultToolTipProps(layout),
        content: error,
        'data-test-subj': `externalLink--${link.id}`,
      },
      iconType: valid ? undefined : 'warning',
      id,
      label: link.label ?? link.destination,
      'data-test-subj': valid ? id : `${id}--error`,
      href: destination,
      onClick: async (event) => {
        trackUiMetric?.(METRIC_TYPE.CLICK, `${EXTERNAL_LINK_TYPE}:click`);

        /** Only use `navigateToUrl` if we **aren't** opening in a new window/tab; otherwise, just use default href handling */
        const modifiedClick = event.ctrlKey || event.metaKey || event.shiftKey;
        if (!modifiedClick) {
          event.preventDefault();
          if (linkOptions.openInNewTab) {
            window.open(destination, '_blank');
          } else {
            await coreServices.application.navigateToUrl(destination);
          }
        }
      },
    };
  }
  if (link.type === DASHBOARD_LINK_TYPE) {
    // TODO check if id matches parent id
    if (!link.destination) return {};
    let error: Error | undefined;
    const linkOptions = {
      ...DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
      ...link.options,
    } as DashboardDrilldownOptions;

    const parentDashboardId = parent.getDashboardSavedObjectId();
    const linkIsCurrentDashboard = link.destination === parentDashboardId;
    let dashboard: DashboardItem | undefined;
    if (link.id !== parentDashboardId) {
      try {
        dashboard = await fetchDashboard(link.destination);
      } catch (e) {
        error = e;
      }
    }
    return {};
  } else throw new Error('Unsupported link type');
}
