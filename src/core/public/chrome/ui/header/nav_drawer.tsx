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

import { EuiHorizontalRule, EuiNavDrawer, EuiNavDrawerGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useObservable } from 'react-use';
import { Observable } from 'rxjs';
import { ChromeNavLink, ChromeRecentlyAccessedHistoryItem, CoreStart } from '../../..';
import { InternalApplicationStart } from '../../../application/types';
import { HttpStart } from '../../../http';
import { OnIsLockedUpdate } from './';
import { createEuiListItem, createRecentNavLink } from './nav_link';
import { RecentLinks } from './recent_links';

export interface Props {
  appId$: InternalApplicationStart['currentAppId$'];
  basePath: HttpStart['basePath'];
  isLocked?: boolean;
  legacyMode: boolean;
  navLinks$: Observable<ChromeNavLink[]>;
  recentlyAccessed$: Observable<ChromeRecentlyAccessedHistoryItem[]>;
  navigateToApp: CoreStart['application']['navigateToApp'];
  onIsLockedUpdate?: OnIsLockedUpdate;
}

function NavDrawerRenderer(
  { isLocked, onIsLockedUpdate, basePath, legacyMode, navigateToApp, ...observables }: Props,
  ref: React.Ref<EuiNavDrawer>
) {
  const appId = useObservable(observables.appId$, '');
  const navLinks = useObservable(observables.navLinks$, []).filter((link) => !link.hidden);
  const recentNavLinks = useObservable(observables.recentlyAccessed$, []).map((link) =>
    createRecentNavLink(link, navLinks, basePath)
  );

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
      {RecentLinks({ recentNavLinks })}
      <EuiHorizontalRule margin="none" />
      <EuiNavDrawerGroup
        data-test-subj="navDrawerAppsMenu"
        listItems={navLinks.map((link) =>
          createEuiListItem({
            link,
            legacyMode,
            appId,
            basePath,
            navigateToApp,
            dataTestSubj: 'navDrawerAppsMenuLink',
          })
        )}
        aria-label={i18n.translate('core.ui.primaryNavList.screenReaderLabel', {
          defaultMessage: 'Primary navigation links',
        })}
      />
    </EuiNavDrawer>
  );
}

export const NavDrawer = React.forwardRef(NavDrawerRenderer);
