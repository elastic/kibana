/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiHeader,
  EuiHeaderLink,
  EuiHeaderLogo,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiLoadingSpinner,
  htmlIdGenerator,
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
import React, { createRef, useCallback, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import useObservable from 'react-use/lib/useObservable';
import { debounceTime, Observable, of } from 'rxjs';
import { HeaderActionMenu, useHeaderActionMenuMounter } from '../header/header_action_menu';
import { HeaderBreadcrumbs } from '../header/header_breadcrumbs';
import { HeaderHelpMenu } from '../header/header_help_menu';
import { HeaderNavControls } from '../header/header_nav_controls';
import { HeaderTopBanner } from '../header/header_top_banner';
import { ScreenReaderRouteAnnouncements, SkipToMainContent } from '../header/screen_reader_a11y';
import { ProjectNavigation } from './navigation';

const headerCss = {
  logo: {
    container: css`
      display: inline-block;
      min-width: 56px; /* 56 = 40 + 8 + 8 */
      padding: 0 8px;
      cursor: pointer;
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
  nav: {
    toggleNavButton: css`
      border-right: 1px solid #d3dae6;
      margin-left: -1px;
    `,
  },
};

const headerStrings = {
  logo: {
    ariaLabel: i18n.translate('core.ui.primaryNav.goToHome.ariaLabel', {
      defaultMessage: 'Go to home page',
    }),
  },
  cloud: {
    linkToProjects: i18n.translate('core.ui.primaryNav.cloud.linkToProjects', {
      defaultMessage: 'Projects',
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
  projectsUrl$: Observable<string | undefined>;
  kibanaVersion: string;
  application: InternalApplicationStart;
  loadingCount$: ReturnType<HttpStart['getLoadingCount$']>;
  navControlsLeft$: Observable<ChromeNavControl[]>;
  navControlsCenter$: Observable<ChromeNavControl[]>;
  navControlsRight$: Observable<ChromeNavControl[]>;
  prependBasePath: (url: string) => string;
}

const LOCAL_STORAGE_IS_OPEN_KEY = 'PROJECT_NAVIGATION_OPEN' as const;
const LOADING_DEBOUNCE_TIME = 80;

const Logo = (
  props: Pick<Props, 'application' | 'homeHref$' | 'loadingCount$' | 'prependBasePath'>
) => {
  const loadingCount = useObservable(
    props.loadingCount$.pipe(debounceTime(LOADING_DEBOUNCE_TIME)),
    0
  );

  const homeHref = useObservable(props.homeHref$, '/app/home');
  const { logo } = headerCss;

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

  const isLoading = loadingCount !== 0;

  return (
    <span
      css={logo.container}
      data-test-subj={`globalLoadingIndicator${isLoading ? '' : '-hidden'}`}
    >
      {isLoading ? (
        <a onClick={navigateHome} href={fullHref} css={logo.spinner}>
          <EuiLoadingSpinner
            size="l"
            aria-hidden={false}
            onClick={navigateHome}
            data-test-subj="nav-header-loading-spinner"
          />
        </a>
      ) : (
        <EuiHeaderLogo
          iconType="logoElastic"
          onClick={navigateHome}
          href={fullHref}
          css={logo}
          data-test-subj="nav-header-logo"
          aria-label={headerStrings.logo.ariaLabel}
        />
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
  ...observables
}: Props) => {
  const [navId] = useState(htmlIdGenerator()());
  const [isOpen, setIsOpen] = useLocalStorage(LOCAL_STORAGE_IS_OPEN_KEY, true);
  const toggleCollapsibleNavRef = createRef<HTMLButtonElement & { euiAnimate: () => void }>();
  const headerActionMenuMounter = useHeaderActionMenuMounter(observables.actionMenu$);
  const projectsUrl = useObservable(observables.projectsUrl$);

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
            <EuiHeaderSection grow={false}>
              <EuiHeaderSectionItem css={headerCss.nav.toggleNavButton}>
                <Router history={application.history}>
                  <ProjectNavigation
                    isOpen={isOpen!}
                    closeNav={() => {
                      setIsOpen(false);
                      if (toggleCollapsibleNavRef.current) {
                        toggleCollapsibleNavRef.current.focus();
                      }
                    }}
                    button={
                      <EuiHeaderSectionItemButton
                        data-test-subj="toggleNavButton"
                        aria-label={headerStrings.nav.closeNavAriaLabel}
                        onClick={() => setIsOpen(!isOpen)}
                        aria-expanded={isOpen!}
                        aria-pressed={isOpen!}
                        aria-controls={navId}
                        ref={toggleCollapsibleNavRef}
                      >
                        <EuiIcon type={isOpen ? 'menuLeft' : 'menuRight'} size="m" />
                      </EuiHeaderSectionItemButton>
                    }
                  >
                    {children}
                  </ProjectNavigation>
                </Router>
              </EuiHeaderSectionItem>

              <EuiHeaderSectionItem>
                <Logo
                  prependBasePath={prependBasePath}
                  application={application}
                  homeHref$={observables.homeHref$}
                  loadingCount$={observables.loadingCount$}
                />
              </EuiHeaderSectionItem>

              <EuiHeaderSectionItem>
                <HeaderNavControls navControls$={observables.navControlsLeft$} />
              </EuiHeaderSectionItem>

              <EuiHeaderSectionItem>
                <EuiHeaderLink href={projectsUrl} data-test-subj={'projectsLink'}>
                  {headerStrings.cloud.linkToProjects}
                </EuiHeaderLink>
              </EuiHeaderSectionItem>

              <EuiHeaderSectionItem>
                <RedirectAppLinks coreStart={{ application }}>
                  <HeaderBreadcrumbs breadcrumbs$={observables.breadcrumbs$} />
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

          <EuiHeader
            position="fixed"
            className="header__secondBar"
            data-test-subj="kibanaProjectHeaderActionMenu"
          >
            <EuiHeaderSection />
            {headerActionMenuMounter.mount && (
              <EuiHeaderSection side="right">
                <EuiHeaderSectionItem>
                  <HeaderActionMenu mounter={headerActionMenuMounter} />
                </EuiHeaderSectionItem>
              </EuiHeaderSection>
            )}
          </EuiHeader>
        </div>
      </header>
    </>
  );
};
