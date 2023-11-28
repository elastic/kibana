/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiHeader,
  EuiHeaderLogo,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiLoadingSpinner,
  useEuiTheme,
  EuiThemeComputed,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import {
  ChromeBreadcrumb,
  ChromeGlobalHelpExtensionMenuLink,
  ChromeHelpExtension,
  ChromeHelpMenuLink,
  ChromeNavControl,
  ChromeUserBanner,
} from '@kbn/core-chrome-browser/src';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import { MountPoint } from '@kbn/core-mount-utils-browser';
import { i18n } from '@kbn/i18n';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { Router } from '@kbn/shared-ux-router';
import React, { useCallback } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { debounceTime, Observable, of } from 'rxjs';
import { useHeaderActionMenuMounter } from '../header/header_action_menu';
import { Breadcrumbs } from './breadcrumbs';
import { HeaderHelpMenu } from '../header/header_help_menu';
import { HeaderNavControls } from '../header/header_nav_controls';
import { HeaderTopBanner } from '../header/header_top_banner';
import { ScreenReaderRouteAnnouncements, SkipToMainContent } from '../header/screen_reader_a11y';
import { AppMenuBar } from './app_menu';
import { ProjectNavigation } from './navigation';

const getHeaderCss = ({ size }: EuiThemeComputed) => ({
  logo: {
    container: css`
      display: inline-block;
      min-width: 56px; /* 56 = 40 + 8 + 8 */
      padding: 0 ${size.s};
      cursor: pointer;
      margin-left: -${size.s}; // to get equal spacing between .euiCollapsibleNavButtonWrapper, logo and breadcrumbs
    `,
    logo: css`
      min-width: 0; /* overrides min-width: 40px */
      padding: 0;
    `,
    spinner: css`
      position: relative;
      left: 4px;
      top: 2px;
    `,
  },
  leftHeaderSection: css`
    // needed to enable breadcrumbs truncation
    min-width: 0;
    flex-shrink: 1;
  `,
  breadcrumbsSectionItem: css`
    min-width: 0; // needed to enable breadcrumbs truncation
  `,
  redirectAppLinksContainer: css`
    min-width: 0; // needed to enable breadcrumbs truncation
  `,
});

type HeaderCss = ReturnType<typeof getHeaderCss>;

const headerStrings = {
  logo: {
    ariaLabel: i18n.translate('core.ui.primaryNav.goToHome.ariaLabel', {
      defaultMessage: 'Go to home page',
    }),
  },
  nav: {
    closeNavAriaLabel: i18n.translate('core.ui.primaryNav.toggleNavAriaLabel', {
      defaultMessage: 'Toggle primary navigation',
    }),
  },
};

export interface Props {
  headerBanner$: Observable<ChromeUserBanner | undefined>;
  breadcrumbs$: Observable<ChromeBreadcrumb[]>;
  actionMenu$: Observable<MountPoint | undefined>;
  docLinks: DocLinksStart;
  children: React.ReactNode;
  globalHelpExtensionMenuLinks$: Observable<ChromeGlobalHelpExtensionMenuLink[]>;
  helpExtension$: Observable<ChromeHelpExtension | undefined>;
  helpSupportUrl$: Observable<string>;
  helpMenuLinks$: Observable<ChromeHelpMenuLink[]>;
  homeHref$: Observable<string | undefined>;
  kibanaVersion: string;
  application: InternalApplicationStart;
  loadingCount$: ReturnType<HttpStart['getLoadingCount$']>;
  navControlsLeft$: Observable<ChromeNavControl[]>;
  navControlsCenter$: Observable<ChromeNavControl[]>;
  navControlsRight$: Observable<ChromeNavControl[]>;
  prependBasePath: (url: string) => string;
  toggleSideNav: (isCollapsed: boolean) => void;
}

const LOADING_DEBOUNCE_TIME = 80;

type LogoProps = Pick<Props, 'application' | 'homeHref$' | 'loadingCount$' | 'prependBasePath'> & {
  logoCss: HeaderCss['logo'];
};

const Logo = (props: LogoProps) => {
  const loadingCount = useObservable(
    props.loadingCount$.pipe(debounceTime(LOADING_DEBOUNCE_TIME)),
    0
  );

  const homeHref = useObservable(props.homeHref$, '/app/home');

  let fullHref: string | undefined;
  if (homeHref) {
    fullHref = props.prependBasePath(homeHref);
  }

  const navigateHome = useCallback(
    (event: React.MouseEvent) => {
      if (fullHref) {
        props.application.navigateToUrl(fullHref);
      }
      event.preventDefault();
    },
    [fullHref, props.application]
  );

  return (
    <span css={props.logoCss.container} data-test-subj="nav-header-logo">
      {loadingCount === 0 ? (
        <EuiHeaderLogo
          iconType="logoElastic"
          onClick={navigateHome}
          href={fullHref}
          css={props.logoCss}
          data-test-subj="globalLoadingIndicator-hidden"
          aria-label={headerStrings.logo.ariaLabel}
        />
      ) : (
        <a onClick={navigateHome} href={fullHref} css={props.logoCss.spinner}>
          <EuiLoadingSpinner
            size="l"
            aria-hidden={false}
            onClick={navigateHome}
            data-test-subj="globalLoadingIndicator"
          />
        </a>
      )}
    </span>
  );
};

export const ProjectHeader = ({
  application,
  kibanaVersion,
  children,
  prependBasePath,
  docLinks,
  toggleSideNav,
  ...observables
}: Props) => {
  const headerActionMenuMounter = useHeaderActionMenuMounter(observables.actionMenu$);
  const { euiTheme } = useEuiTheme();
  const headerCss = getHeaderCss(euiTheme);
  const { logo: logoCss } = headerCss;

  return (
    <>
      <ScreenReaderRouteAnnouncements
        breadcrumbs$={observables.breadcrumbs$}
        customBranding$={of()}
        appId$={application.currentAppId$}
      />
      <SkipToMainContent />

      <HeaderTopBanner headerBanner$={observables.headerBanner$} />
      <header data-test-subj="kibanaProjectHeader">
        <div id="globalHeaderBars" data-test-subj="headerGlobalNav" className="header__bars">
          <EuiHeader position="fixed" className="header__firstBar">
            <EuiHeaderSection grow={false} css={headerCss.leftHeaderSection}>
              <Router history={application.history}>
                <ProjectNavigation toggleSideNav={toggleSideNav}>{children}</ProjectNavigation>
              </Router>

              <EuiHeaderSectionItem>
                <Logo
                  prependBasePath={prependBasePath}
                  application={application}
                  homeHref$={observables.homeHref$}
                  loadingCount$={observables.loadingCount$}
                  logoCss={logoCss}
                />
              </EuiHeaderSectionItem>

              <EuiHeaderSectionItem css={headerCss.breadcrumbsSectionItem}>
                <RedirectAppLinks
                  coreStart={{ application }}
                  css={headerCss.redirectAppLinksContainer}
                >
                  <Breadcrumbs breadcrumbs$={observables.breadcrumbs$} />
                </RedirectAppLinks>
              </EuiHeaderSectionItem>
            </EuiHeaderSection>

            <EuiHeaderSection side="right">
              <EuiHeaderSectionItem>
                <HeaderNavControls navControls$={observables.navControlsCenter$} />
              </EuiHeaderSectionItem>

              <EuiHeaderSectionItem>
                <HeaderHelpMenu
                  globalHelpExtensionMenuLinks$={observables.globalHelpExtensionMenuLinks$}
                  helpExtension$={observables.helpExtension$}
                  helpSupportUrl$={observables.helpSupportUrl$}
                  defaultContentLinks$={observables.helpMenuLinks$}
                  kibanaDocLink={docLinks.links.elasticStackGetStarted}
                  docLinks={docLinks}
                  kibanaVersion={kibanaVersion}
                  navigateToUrl={application.navigateToUrl}
                />
              </EuiHeaderSectionItem>

              <EuiHeaderSectionItem>
                <HeaderNavControls navControls$={observables.navControlsRight$} />
              </EuiHeaderSectionItem>
            </EuiHeaderSection>
          </EuiHeader>
        </div>
      </header>

      {headerActionMenuMounter.mount && (
        <AppMenuBar headerActionMenuMounter={headerActionMenuMounter} />
      )}
    </>
  );
};
