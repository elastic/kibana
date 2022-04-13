/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiFlexGroup,
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
import {
  ChromeBreadcrumbsAppendExtension,
  ChromeHelpExtension,
  ChromeUserBanner,
} from '../../types';
import { OnIsLockedUpdate } from './';
import { CollapsibleNav } from './collapsible_nav';
import { HeaderBadge } from './header_badge';
import { HeaderBreadcrumbs } from './header_breadcrumbs';
import { HeaderHelpMenu } from './header_help_menu';
import { HeaderLogo } from './header_logo';
import { HeaderNavControls } from './header_nav_controls';
import { HeaderActionMenu } from './header_action_menu';
import { HeaderExtension } from './header_extension';
import { HeaderTopBanner } from './header_top_banner';

export interface HeaderProps {
  kibanaVersion: string;
  application: InternalApplicationStart;
  headerBanner$: Observable<ChromeUserBanner | undefined>;
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
  breadcrumbsAppendExtension$,
  ...observables
}: HeaderProps) {
  const isVisible = useObservable(observables.isVisible$, false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [navId] = useState(htmlIdGenerator()());
  const breadcrumbsAppendExtension = useObservable(breadcrumbsAppendExtension$);

  if (!isVisible) {
    return (
      <>
        <LoadingIndicator loadingCount$={observables.loadingCount$} showAsBar />
        <HeaderTopBanner headerBanner$={observables.headerBanner$} />
      </>
    );
  }

  const toggleCollapsibleNavRef = createRef<HTMLButtonElement & { euiAnimate: () => void }>();
  const className = classnames('hide-for-sharing', 'headerGlobalNav');

  const Breadcrumbs = <HeaderBreadcrumbs breadcrumbs$={observables.breadcrumbs$} />;

  return (
    <>
      <HeaderTopBanner headerBanner$={observables.headerBanner$} />
      <header className={className} data-test-subj="headerGlobalNav">
        <div id="globalHeaderBars" className="header__bars">
          <EuiHeader
            theme="dark"
            position="fixed"
            className="header__firstBar"
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

          <EuiHeader position="fixed" className="header__secondBar">
            <EuiHeaderSection grow={false}>
              <EuiHeaderSectionItem border="right" className="header__toggleNavButtonSection">
                <CollapsibleNav
                  appId$={application.currentAppId$}
                  id={navId}
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
                  button={
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
                  }
                />
              </EuiHeaderSectionItem>

              <HeaderNavControls side="left" navControls$={observables.navControlsLeft$} />
            </EuiHeaderSection>

            {!breadcrumbsAppendExtension ? (
              Breadcrumbs
            ) : (
              <EuiFlexGroup
                responsive={false}
                wrap={false}
                alignItems={'center'}
                className={'header__breadcrumbsWithExtensionContainer'}
                gutterSize={'none'}
              >
                {Breadcrumbs}
                <HeaderExtension
                  extension={breadcrumbsAppendExtension.content}
                  containerClassName={'header__breadcrumbsAppendExtension'}
                />
              </EuiFlexGroup>
            )}

            <HeaderBadge badge$={observables.badge$} />

            <EuiHeaderSection side="right">
              <EuiHeaderSectionItem border="none">
                <HeaderActionMenu actionMenu$={application.currentActionMenu$} />
              </EuiHeaderSectionItem>
            </EuiHeaderSection>
          </EuiHeader>
        </div>
      </header>
    </>
  );
}
