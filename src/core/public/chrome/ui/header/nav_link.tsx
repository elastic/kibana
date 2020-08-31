/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ChromeNavLink, ChromeRecentlyAccessedHistoryItem, CoreStart } from '../../..';
import { HttpStart } from '../../../http';
import { relativeToAbsolute } from '../../nav_links/to_nav_link';

export const isModifiedOrPrevented = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) =>
  event.metaKey || event.altKey || event.ctrlKey || event.shiftKey || event.defaultPrevented;

interface Props {
  link: ChromeNavLink;
  legacyMode: boolean;
  appId?: string;
  basePath?: HttpStart['basePath'];
  dataTestSubj: string;
  onClick?: Function;
  navigateToApp: CoreStart['application']['navigateToApp'];
  externalLink?: boolean;
}

// TODO #64541
// Set return type to EuiListGroupItemProps
// Currently it's a subset of EuiListGroupItemProps+FlyoutMenuItem for CollapsibleNav and NavDrawer
// But FlyoutMenuItem isn't exported from EUI
export function createEuiListItem({
  link,
  legacyMode,
  appId,
  basePath,
  onClick = () => {},
  navigateToApp,
  dataTestSubj,
  externalLink = false,
}: Props) {
  const { legacy, active, id, title, disabled, euiIconType, icon, tooltip } = link;
  let { href } = link;

  if (legacy) {
    href = link.url && !active ? link.url : link.baseUrl;
  }

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
        !legacyMode && // ignore when in legacy mode
        !legacy && // ignore links to legacy apps
        event.button === 0 && // ignore everything but left clicks
        !isModifiedOrPrevented(event)
      ) {
        event.preventDefault();
        navigateToApp(id);
      }
    },
    // Legacy apps use `active` property, NP apps should match the current app
    isActive: active || appId === id,
    isDisabled: disabled,
    'data-test-subj': dataTestSubj,
    ...(basePath && {
      iconType: euiIconType,
      icon:
        !euiIconType && icon ? <EuiIcon type={basePath.prepend(`/${icon}`)} size="m" /> : undefined,
    }),
  };
}

export interface RecentNavLink {
  href: string;
  label: string;
  title: string;
  'aria-label': string;
  iconType?: string;
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
  basePath: HttpStart['basePath']
) {
  const { link, label } = recentLink;
  const href = relativeToAbsolute(basePath.prepend(link));
  const navLink = navLinks.find((nl) => href.startsWith(nl.baseUrl ?? nl.subUrlBase));
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
  };
}
