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
import * as Rx from 'rxjs';
import { useObservable } from 'react-use';
import { OnIsLockedUpdate } from './';
import { RecentLinks } from './recent_links';
import { HttpStart } from '../../../http';
import { InternalApplicationStart } from '../../../application/types';
import { createRecentNavLink, createEuiListItem } from './nav_link';
import { ChromeNavLink, CoreStart, ChromeRecentlyAccessedHistoryItem } from '../../..';

export interface Props {
  appId$: InternalApplicationStart['currentAppId$'];
  basePath: HttpStart['basePath'];
  isLocked?: boolean;
  legacyMode: boolean;
  navLinks$: Rx.Observable<ChromeNavLink[]>;
  recentlyAccessed$: Rx.Observable<ChromeRecentlyAccessedHistoryItem[]>;
  navigateToApp: CoreStart['application']['navigateToApp'];
  onIsLockedUpdate?: OnIsLockedUpdate;
}

function NavDrawerRenderer(
  { isLocked, onIsLockedUpdate, basePath, legacyMode, navigateToApp, ...observables }: Props,
  ref: React.Ref<HTMLElement>
) {
  const appId = useObservable(observables.appId$, '');
  const navLinks = useObservable(observables.navLinks$, []).filter(link => !link.hidden);
  const recentNavLinks = useObservable(observables.recentlyAccessed$, []).map(link =>
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
        listItems={navLinks.map(link =>
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
