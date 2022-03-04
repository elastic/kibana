/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiIcon, EuiListGroupItemProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ChromeNavLink, ChromeRecentlyAccessedHistoryItem, CoreStart } from '../../..';
import { HttpStart } from '../../../http';
import { InternalApplicationStart } from '../../../application/types';
import { relativeToAbsolute } from '../../nav_links/to_nav_link';

export const isModifiedOrPrevented = (event: React.MouseEvent<HTMLElement, MouseEvent>) =>
  event.metaKey || event.altKey || event.ctrlKey || event.shiftKey || event.defaultPrevented;

interface Props {
  link: ChromeNavLink;
  appId?: string;
  basePath?: HttpStart['basePath'];
  dataTestSubj?: string;
  onClick?: Function;
  navigateToUrl: CoreStart['application']['navigateToUrl'];
  externalLink?: boolean;
  iconProps?: EuiListGroupItemProps['iconProps'];
}

// TODO #64541
// Set return type to EuiListGroupItemProps
// Currently it's a subset of EuiListGroupItemProps+FlyoutMenuItem for CollapsibleNav and NavDrawer
// But FlyoutMenuItem isn't exported from EUI
export function createEuiListItem({
  link,
  appId,
  basePath,
  onClick = () => {},
  navigateToUrl,
  dataTestSubj,
  externalLink = false,
  iconProps,
}: Props): EuiListGroupItemProps {
  const { href, id, title, disabled, euiIconType, icon, tooltip, url } = link;

  return {
    label: tooltip ?? title,
    href,
    /* Use href and onClick to support "open in new tab" and SPA navigation in the same link */
    onClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
      if (!isModifiedOrPrevented(event)) {
        onClick();
      }

      if (
        !externalLink && // ignore external links
        event.button === 0 && // ignore everything but left clicks
        !isModifiedOrPrevented(event)
      ) {
        event.preventDefault();
        navigateToUrl(url);
      }
    },
    isActive: !externalLink && appId === id,
    isDisabled: disabled,
    'data-test-subj': dataTestSubj,
    ...(basePath && {
      iconType: euiIconType,
      iconProps,
      icon:
        !euiIconType && icon ? <EuiIcon type={basePath.prepend(`/${icon}`)} size="m" /> : undefined,
    }),
  };
}

export function createEuiButtonItem({
  link,
  onClick = () => {},
  navigateToUrl,
  dataTestSubj,
}: Omit<Props, 'appId' | 'basePath'>) {
  const { href, disabled, url, id } = link;

  return {
    href,
    /* Use href and onClick to support "open in new tab" and SPA navigation in the same link */
    onClick(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) {
      if (!isModifiedOrPrevented(event)) {
        onClick();
      }
      event.preventDefault();
      navigateToUrl(url);
    },
    isDisabled: disabled,
    dataTestSubj: `collapsibleNavAppButton-${id}`,
  };
}

export function createOverviewLink({
  link,
  onClick = () => {},
  navigateToUrl,
}: Omit<Props, 'appId' | 'basePath'>) {
  const { href, url } = link;

  return {
    href,
    /* Use href and onClick to support "open in new tab" and SPA navigation in the same link */
    onClick(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) {
      // Prevent the accordions from opening or closing when clicking just the link
      event.stopPropagation();
      if (!isModifiedOrPrevented(event)) {
        onClick();
      }
      event.preventDefault();
      navigateToUrl(url);
    },
    'data-test-subj': `collapsibleNavAppLink-overview`,
  };
}

export interface RecentNavLink {
  href: string;
  label: string;
  title: string;
  'aria-label': string;
  iconType?: string;
  onClick: React.MouseEventHandler;
}

/**
 * Add saved object type info to recently links
 * TODO #64541 - set return type to EuiListGroupItemProps
 *
 * Recent nav links are similar to normal nav links but are missing some Kibana Platform magic and
 * because of legacy reasons have slightly different properties.
 * @param recentLink
 * @param navLinks
 * @param basePath
 */
export function createRecentNavLink(
  recentLink: ChromeRecentlyAccessedHistoryItem,
  navLinks: ChromeNavLink[],
  basePath: HttpStart['basePath'],
  navigateToUrl: InternalApplicationStart['navigateToUrl']
): RecentNavLink {
  const { link, label } = recentLink;
  const href = relativeToAbsolute(basePath.prepend(link));
  const navLink = navLinks.find((nl) => href.startsWith(nl.baseUrl));
  let titleAndAriaLabel = label;

  if (navLink) {
    titleAndAriaLabel = i18n.translate('core.ui.recentLinks.linkItem.screenReaderLabel', {
      defaultMessage: '{recentlyAccessedItemLinklabel}, type: {pageType}',
      values: {
        recentlyAccessedItemLinklabel: label,
        pageType: navLink.title,
      },
    });
  }

  return {
    href,
    label,
    title: titleAndAriaLabel,
    'aria-label': titleAndAriaLabel,
    iconType: navLink?.euiIconType,
    /* Use href and onClick to support "open in new tab" and SPA navigation in the same link */
    onClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
      if (event.button === 0 && !isModifiedOrPrevented(event)) {
        event.preventDefault();
        navigateToUrl(href);
      }
    },
  };
}
