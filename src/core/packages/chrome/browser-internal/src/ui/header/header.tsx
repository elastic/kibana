/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiHeader,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiHideFor,
  EuiShowFor,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import classnames from 'classnames';
import React, { createRef, useState } from 'react';
import type { Observable } from 'rxjs';
import type { HttpStart } from '@kbn/core-http-browser';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type {
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeNavControl,
  ChromeNavLink,
  ChromeHelpMenuLink,
  ChromeRecentlyAccessedHistoryItem,
  ChromeBreadcrumbsAppendExtension,
  ChromeHelpExtension,
  ChromeGlobalHelpExtensionMenuLink,
  ChromeUserBanner,
} from '@kbn/core-chrome-browser';
import { CustomBranding } from '@kbn/core-custom-branding-common';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { css } from '@emotion/react';
import { CollapsibleNav } from './collapsible_nav';
import { HeaderBadge } from './header_badge';
import { HeaderBreadcrumbs } from './header_breadcrumbs';
import { HeaderHelpMenu } from './header_help_menu';
import { HeaderLogo } from './header_logo';
import { HeaderNavControls } from './header_nav_controls';
import { HeaderActionMenu, useHeaderActionMenuMounter } from './header_action_menu';
import { BreadcrumbsWithExtensionsWrapper } from './breadcrumbs_with_extensions';
import { HeaderTopBanner } from './header_top_banner';
import { HeaderMenuButton } from './header_menu_button';
import { ScreenReaderRouteAnnouncements, SkipToMainContent } from './screen_reader_a11y';

export interface HeaderProps {
  kibanaVersion: string;
  application: InternalApplicationStart;
  headerBanner$?: Observable<ChromeUserBanner | undefined> | null;
  badge$: Observable<ChromeBadge | undefined>;
  breadcrumbs$: Observable<ChromeBreadcrumb[]>;
  breadcrumbsAppendExtensions$: Observable<ChromeBreadcrumbsAppendExtension[]>;
  customNavLink$: Observable<ChromeNavLink | undefined>;
  homeHref: string;
  kibanaDocLink: string;
  docLinks: DocLinksStart;
  navLinks$: Observable<ChromeNavLink[]>;
  recentlyAccessed$: Observable<ChromeRecentlyAccessedHistoryItem[]>;
  forceAppSwitcherNavigation$: Observable<boolean>;
  globalHelpExtensionMenuLinks$: Observable<ChromeGlobalHelpExtensionMenuLink[]>;
  helpExtension$: Observable<ChromeHelpExtension | undefined>;
  helpSupportUrl$: Observable<string>;
  helpMenuLinks$: Observable<ChromeHelpMenuLink[]>;
  navControlsLeft$: Observable<readonly ChromeNavControl[]>;
  navControlsCenter$: Observable<readonly ChromeNavControl[]>;
  navControlsRight$: Observable<readonly ChromeNavControl[]>;
  navControlsExtension$: Observable<readonly ChromeNavControl[]>;
  basePath: HttpStart['basePath'];
  loadingCount$: ReturnType<HttpStart['getLoadingCount$']>;
  customBranding$: Observable<CustomBranding>;
  isServerless: boolean;
  isFixed: boolean;
  as?: 'div' | 'header';
}

export function Header({
  kibanaVersion,
  kibanaDocLink,
  docLinks,
  application,
  basePath,
  homeHref,
  breadcrumbsAppendExtensions$,
  globalHelpExtensionMenuLinks$,
  customBranding$,
  isServerless,
  isFixed,
  as = 'header',
  ...observables
}: HeaderProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [navId] = useState(htmlIdGenerator()());
  const headerActionMenuMounter = useHeaderActionMenuMounter(application.currentActionMenu$);

  const toggleCollapsibleNavRef = createRef<HTMLButtonElement & { euiAnimate: () => void }>();
  const className = classnames('hide-for-sharing', 'headerGlobalNav');

  const Breadcrumbs = <HeaderBreadcrumbs breadcrumbs$={observables.breadcrumbs$} />;
  const HeaderElement = as === 'header' ? 'header' : 'div';

  return (
    <>
      <ScreenReaderRouteAnnouncements
        breadcrumbs$={observables.breadcrumbs$}
        customBranding$={customBranding$}
        appId$={application.currentAppId$}
      />
      <SkipToMainContent />

      {observables.headerBanner$ && <HeaderTopBanner headerBanner$={observables.headerBanner$} />}
      <HeaderElement className={className} data-test-subj="headerGlobalNav">
        <div id="globalHeaderBars" className="header__bars">
          <EuiHeader
            theme="dark"
            position={isFixed ? 'fixed' : 'static'}
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
                    customBranding$={customBranding$}
                  />,
                ],
              },
              {
                ...(observables.navControlsCenter$ && {
                  items: [
                    <EuiShowFor sizes={['m', 'l', 'xl']}>
                      <HeaderNavControls navControls$={observables.navControlsCenter$} />
                    </EuiShowFor>,
                  ],
                }),
              },
              {
                items: [
                  <EuiHideFor sizes={['m', 'l', 'xl']}>
                    <>
                      <HeaderNavControls navControls$={observables.navControlsExtension$} />
                      <HeaderNavControls navControls$={observables.navControlsCenter$} />
                    </>
                  </EuiHideFor>,
                  <EuiHideFor sizes={['xs', 's']}>
                    <HeaderNavControls navControls$={observables.navControlsExtension$} />
                  </EuiHideFor>,
                  <HeaderHelpMenu
                    isServerless={isServerless}
                    globalHelpExtensionMenuLinks$={globalHelpExtensionMenuLinks$}
                    helpExtension$={observables.helpExtension$}
                    helpSupportUrl$={observables.helpSupportUrl$}
                    defaultContentLinks$={observables.helpMenuLinks$}
                    kibanaDocLink={kibanaDocLink}
                    docLinks={docLinks}
                    kibanaVersion={kibanaVersion}
                    navigateToUrl={application.navigateToUrl}
                  />,
                  <HeaderNavControls navControls$={observables.navControlsRight$} />,
                ],
              },
            ]}
          />

          <EuiHeader position={isFixed ? 'fixed' : 'static'} className="header__secondBar">
            <EuiHeaderSection grow={false}>
              <EuiHeaderSectionItem className="header__toggleNavButtonSection">
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
                  closeNav={() => {
                    setIsNavOpen(false);
                  }}
                  customNavLink$={observables.customNavLink$}
                  button={
                    <HeaderMenuButton
                      data-test-subj="toggleNavButton"
                      aria-label={i18n.translate('core.ui.primaryNav.header.toggleNavAriaLabel', {
                        defaultMessage: 'Toggle primary navigation',
                      })}
                      onClick={() => setIsNavOpen(!isNavOpen)}
                      aria-expanded={isNavOpen}
                      aria-pressed={isNavOpen}
                      aria-controls={navId}
                      forwardRef={toggleCollapsibleNavRef}
                    />
                  }
                />
              </EuiHeaderSectionItem>

              <HeaderNavControls side="left" navControls$={observables.navControlsLeft$} />
            </EuiHeaderSection>
            <RedirectAppLinks
              coreStart={{ application }}
              css={css`
                min-width: 0; // enable text truncation for long breadcrumb titles
              `}
            >
              <BreadcrumbsWithExtensionsWrapper
                breadcrumbsAppendExtensions$={breadcrumbsAppendExtensions$}
              >
                {Breadcrumbs}
              </BreadcrumbsWithExtensionsWrapper>
            </RedirectAppLinks>

            <HeaderBadge badge$={observables.badge$} />

            <EuiHeaderSection side="right">
              <EuiHeaderSectionItem>
                <HeaderActionMenu mounter={headerActionMenuMounter} />
              </EuiHeaderSectionItem>
            </EuiHeaderSection>
          </EuiHeader>
        </div>
      </HeaderElement>
    </>
  );
}
