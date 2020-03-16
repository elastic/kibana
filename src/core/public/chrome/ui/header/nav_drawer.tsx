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
import { EuiNavDrawer, EuiHorizontalRule, EuiNavDrawerGroup } from '@elastic/eui';
import { OnIsLockedUpdate } from './';
import { ChromeNavLink, ChromeRecentlyAccessedHistoryItem } from '../../..';
import { HttpStart } from '../../../http';
import { NavLink } from './nav_link';
import { RecentLinks } from './recent_links';

export interface Props {
  isLocked?: boolean;
  onIsLockedUpdate?: OnIsLockedUpdate;
  navLinks: NavLink[];
  chromeNavLinks: ChromeNavLink[];
  recentlyAccessedItems: ChromeRecentlyAccessedHistoryItem[];
  basePath: HttpStart['basePath'];
}

function navDrawerRenderer(
  { isLocked, onIsLockedUpdate, navLinks, chromeNavLinks, recentlyAccessedItems, basePath }: Props,
  ref: React.Ref<HTMLElement>
) {
  return (
    <EuiNavDrawer
      ref={ref}
      data-test-subj="navDrawer"
      isLocked={isLocked}
      onIsLockedUpdate={onIsLockedUpdate}
      aria-label={i18n.translate('core.ui.primaryNav.screenReaderLabel', {
        defaultMessage: 'Primary',
      })}
    >
      {RecentLinks({
        recentlyAccessedItems,
        navLinks: chromeNavLinks,
        basePath,
      })}
      <EuiHorizontalRule margin="none" />
      <EuiNavDrawerGroup
        data-test-subj="navDrawerAppsMenu"
        listItems={navLinks}
        aria-label={i18n.translate('core.ui.primaryNavList.screenReaderLabel', {
          defaultMessage: 'Primary navigation links',
        })}
      />
    </EuiNavDrawer>
  );
}

export const NavDrawer = React.forwardRef(navDrawerRenderer);
