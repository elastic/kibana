/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  EuiHeader,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiHeaderSectionItemButton,
  EuiHideFor,
  EuiIcon,
  EuiShowFor,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import classnames from 'classnames';
import React, { createRef, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import { LoadingIndicator } from '../';
import {
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeNavControl,
  ChromeNavLink,
  ChromeRecentlyAccessedHistoryItem,
} from '../..';
import { InternalApplicationStart } from '../../../application/types';
import { HttpStart } from '../../../http';
import { ChromeBreadcrumbsAppendExtension, ChromeHelpExtension } from '../../chrome_service';
import { OnIsLockedUpdate } from './';
import { CollapsibleNav } from './collapsible_nav';
import { HeaderBadge } from './header_badge';
import { HeaderBreadcrumbs } from './header_breadcrumbs';
import { HeaderHelpMenu } from './header_help_menu';
import { HeaderLogo } from './header_logo';
import { HeaderNavControls } from './header_nav_controls';
import { HeaderActionMenu } from './header_action_menu';

export interface HeaderProps {
  kibanaVersion: string;
  application: InternalApplicationStart;
  appTitle$: Observable<string>;
  badge$: Observable<ChromeBadge | undefined>;
  breadcrumbs$: Observable<ChromeBreadcrumb[]>;
  breadcrumbsAppendExtension$: Observable<ChromeBreadcrumbsAppendExtension | undefined>;
  customNavLink$: Observable<ChromeNavLink | undefined>;
  homeHref: string;
  isVisible$: Observable<boolean>;
  kibanaDocLink: string;
  navLinks$: Observable<ChromeNavLink[]>;
  recentlyAccessed$: Observable<ChromeRecentlyAccessedHistoryItem[]>;
  forceAppSwitcherNavigation$: Observable<boolean>;
  helpExtension$: Observable<ChromeHelpExtension | undefined>;
  helpSupportUrl$: Observable<string>;
  navControlsLeft$: Observable<readonly ChromeNavControl[]>;
  navControlsCenter$: Observable<readonly ChromeNavControl[]>;
  navControlsRight$: Observable<readonly ChromeNavControl[]>;
  basePath: HttpStart['basePath'];
  isLocked$: Observable<boolean>;
  loadingCount$: ReturnType<HttpStart['getLoadingCount$']>;
  onIsLockedUpdate: OnIsLockedUpdate;
}

export function Header({
  kibanaVersion,
  kibanaDocLink,
  application,
  basePath,
  onIsLockedUpdate,
  homeHref,
  ...observables
}: HeaderProps) {
  const isVisible = useObservable(observables.isVisible$, false);
  const isLocked = useObservable(observables.isLocked$, false);
  const [isNavOpen, setIsNavOpen] = useState(false);

  if (!isVisible) {
    return <LoadingIndicator loadingCount$={observables.loadingCount$} showAsBar />;
  }

  const toggleCollapsibleNavRef = createRef<HTMLButtonElement>();
  const navId = htmlIdGenerator()();
  const className = classnames('hide-for-sharing', 'headerGlobalNav');

  return (
    <>
      <header className={className} data-test-subj="headerGlobalNav">
        <div id="globalHeaderBars">
          <EuiHeader
            theme="dark"
            position="fixed"
            sections={[
              {
                items: [
                  <HeaderLogo
                    href={homeHref}
                    forceNavigation$={observables.forceAppSwitcherNavigation$}
                    navLinks$={observables.navLinks$}
                    navigateToApp={application.navigateToApp}
                    loadingCount$={observables.loadingCount$}
                  />,
                ],
                borders: 'none',
              },
              {
                ...(observables.navControlsCenter$ && {
                  items: [
                    <EuiShowFor sizes={['m', 'l', 'xl']}>
                      <HeaderNavControls navControls$={observables.navControlsCenter$} />
                    </EuiShowFor>,
                  ],
                }),
                borders: 'none',
              },
              {
                items: [
                  <EuiHideFor sizes={['m', 'l', 'xl']}>
                    <HeaderNavControls navControls$={observables.navControlsCenter$} />
                  </EuiHideFor>,
                  <HeaderHelpMenu
                    helpExtension$={observables.helpExtension$}
                    helpSupportUrl$={observables.helpSupportUrl$}
                    kibanaDocLink={kibanaDocLink}
                    kibanaVersion={kibanaVersion}
                    navigateToUrl={application.navigateToUrl}
                  />,
                  <HeaderNavControls navControls$={observables.navControlsRight$} />,
                ],
                borders: 'none',
              },
            ]}
          />

          <EuiHeader position="fixed">
            <EuiHeaderSection grow={false}>
              <EuiHeaderSectionItem border="right" className="header__toggleNavButtonSection">
                <EuiHeaderSectionItemButton
                  data-test-subj="toggleNavButton"
                  aria-label={i18n.translate('core.ui.primaryNav.toggleNavAriaLabel', {
                    defaultMessage: 'Toggle primary navigation',
                  })}
                  onClick={() => setIsNavOpen(!isNavOpen)}
                  aria-expanded={isNavOpen}
                  aria-pressed={isNavOpen}
                  aria-controls={navId}
                  ref={toggleCollapsibleNavRef}
                >
                  <EuiIcon type="menu" size="m" />
                </EuiHeaderSectionItemButton>
              </EuiHeaderSectionItem>

              <HeaderNavControls side="left" navControls$={observables.navControlsLeft$} />
            </EuiHeaderSection>

            <HeaderBreadcrumbs
              appTitle$={observables.appTitle$}
              breadcrumbs$={observables.breadcrumbs$}
              breadcrumbsAppendExtension$={observables.breadcrumbsAppendExtension$}
            />

            <HeaderBadge badge$={observables.badge$} />

            <EuiHeaderSection side="right">
              <EuiHeaderSectionItem border="none">
                <HeaderActionMenu actionMenu$={application.currentActionMenu$} />
              </EuiHeaderSectionItem>
            </EuiHeaderSection>
          </EuiHeader>
        </div>

        <CollapsibleNav
          appId$={application.currentAppId$}
          id={navId}
          isLocked={isLocked}
          navLinks$={observables.navLinks$}
          recentlyAccessed$={observables.recentlyAccessed$}
          isNavOpen={isNavOpen}
          homeHref={homeHref}
          basePath={basePath}
          navigateToApp={application.navigateToApp}
          navigateToUrl={application.navigateToUrl}
          onIsLockedUpdate={onIsLockedUpdate}
          closeNav={() => {
            setIsNavOpen(false);
            if (toggleCollapsibleNavRef.current) {
              toggleCollapsibleNavRef.current.focus();
            }
          }}
          customNavLink$={observables.customNavLink$}
        />
      </header>
    </>
  );
}
