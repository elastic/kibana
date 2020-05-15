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

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiImage } from '@elastic/eui';
import { AppCategory } from 'src/core/types';
import { ChromeNavLink, CoreStart, ChromeRecentlyAccessedHistoryItem } from '../../../';
import { HttpStart } from '../../../http';

function isModifiedEvent(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}

function LinkIcon({ url }: { url: string }) {
  return <EuiImage size="s" alt="" aria-hidden={true} url={url} />;
}

export interface NavLink {
  key: string;
  label: string;
  href: string;
  isActive: boolean;
  onClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void;
  category?: AppCategory;
  isDisabled?: boolean;
  iconType?: string;
  icon?: JSX.Element;
  order?: number;
  'data-test-subj': string;
}

/**
 * Create a link that's actually ready to be passed into EUI
 *
 * @param navLink
 * @param legacyMode
 * @param currentAppId
 * @param basePath
 * @param navigateToApp
 */
export function createNavLink(
  navLink: ChromeNavLink,
  legacyMode: boolean,
  currentAppId: string | undefined,
  basePath: HttpStart['basePath'],
  navigateToApp: CoreStart['application']['navigateToApp']
): NavLink {
  const {
    legacy,
    url,
    active,
    baseUrl,
    id,
    title,
    disabled,
    euiIconType,
    icon,
    category,
    order,
    tooltip,
  } = navLink;
  let href = navLink.url ?? navLink.baseUrl;

  if (legacy) {
    href = url && !active ? url : baseUrl;
  }

  return {
    category,
    key: id,
    label: tooltip ?? title,
    href, // Use href and onClick to support "open in new tab" and SPA navigation in the same link
    onClick(event) {
      if (
        !legacyMode && // ignore when in legacy mode
        !legacy && // ignore links to legacy apps
        !event.defaultPrevented && // onClick prevented default
        event.button === 0 && // ignore everything but left clicks
        !isModifiedEvent(event) // ignore clicks with modifier keys
      ) {
        event.preventDefault();
        navigateToApp(navLink.id);
      }
    },
    // Legacy apps use `active` property, NP apps should match the current app
    isActive: active || currentAppId === id,
    isDisabled: disabled,
    iconType: euiIconType,
    icon: !euiIconType && icon ? <LinkIcon url={basePath.prepend(`/${icon}`)} /> : undefined,
    order,
    'data-test-subj': 'navDrawerAppsMenuLink',
  };
}

// Providing a buffer between the limit and the cut off index
// protects from truncating just the last couple (6) characters
const TRUNCATE_LIMIT: number = 64;
const TRUNCATE_AT: number = 58;

function truncateRecentItemLabel(label: string): string {
  if (label.length > TRUNCATE_LIMIT) {
    label = `${label.substring(0, TRUNCATE_AT)}…`;
  }

  return label;
}

/**
 * @param {string} url - a relative or root relative url.  If a relative path is given then the
 * absolute url returned will depend on the current page where this function is called from. For example
 * if you are on page "http://www.mysite.com/shopping/kids" and you pass this function "adults", you would get
 * back "http://www.mysite.com/shopping/adults".  If you passed this function a root relative path, or one that
 * starts with a "/", for example "/account/cart", you would get back "http://www.mysite.com/account/cart".
 * @return {string} the relative url transformed into an absolute url
 */
function relativeToAbsolute(url: string) {
  const a = document.createElement('a');
  a.setAttribute('href', url);
  return a.href;
}

export interface RecentNavLink {
  href: string;
  label: string;
  title: string;
  'aria-label': string;
  iconType?: string;
  onClick?(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void;
}

/**
 * Add saved object type info to recently links
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
  const navLink = navLinks.find(nl => href.startsWith(nl.baseUrl ?? nl.subUrlBase));
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
    label: truncateRecentItemLabel(label),
    title: titleAndAriaLabel,
    'aria-label': titleAndAriaLabel,
    iconType: navLink?.euiIconType,
  };
}
