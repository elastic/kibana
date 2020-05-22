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
// @ts-ignore
import { EuiNavDrawerGroup } from '@elastic/eui';
import { ChromeNavLink, ChromeRecentlyAccessedHistoryItem } from '../../..';
import { HttpStart } from '../../../http';

// Providing a buffer between the limit and the cut off index
// protects from truncating just the last couple (6) characters
const TRUNCATE_LIMIT: number = 64;
const TRUNCATE_AT: number = 58;

export function truncateRecentItemLabel(label: string): string {
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

function prepareForEUI(
  recentlyAccessed: ChromeRecentlyAccessedHistoryItem[],
  navLinks: ChromeNavLink[],
  basePath: HttpStart['basePath']
) {
  return recentlyAccessed.map(({ link, label }) => {
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
      label: truncateRecentItemLabel(label),
      title: titleAndAriaLabel,
      'aria-label': titleAndAriaLabel,
      iconType: navLink?.euiIconType,
    };
  });
}

interface Props {
  recentlyAccessedItems: ChromeRecentlyAccessedHistoryItem[];
  navLinks: ChromeNavLink[];
  basePath: HttpStart['basePath'];
}

export function RecentLinks({ recentlyAccessedItems, navLinks, basePath }: Props) {
  return (
    <EuiNavDrawerGroup
      listItems={[
        {
          label: i18n.translate('core.ui.chrome.sideGlobalNav.viewRecentItemsLabel', {
            defaultMessage: 'Recently viewed',
          }),
          iconType: 'recentlyViewedApp',
          isDisabled: recentlyAccessedItems.length === 0,
          flyoutMenu: {
            title: i18n.translate('core.ui.chrome.sideGlobalNav.viewRecentItemsFlyoutTitle', {
              defaultMessage: 'Recent items',
            }),
            listItems: prepareForEUI(recentlyAccessedItems, navLinks, basePath),
          },
        },
      ]}
      aria-label={i18n.translate('core.ui.recentLinks.screenReaderLabel', {
        defaultMessage: 'Recently viewed links, navigation',
      })}
    />
  );
}
