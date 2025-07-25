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
  EuiHeaderLogo,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiImage,
  EuiLoadingSpinner,
  EuiThemeComputed,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { i18n } from '@kbn/i18n';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { Router } from '@kbn/shared-ux-router';
import React, { type ComponentProps, useCallback } from 'react';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';

import { Breadcrumbs } from './breadcrumbs';
import { HeaderHelpMenu } from '../header/header_help_menu';
import { HeaderNavControls } from '../header/header_nav_controls';
import { HeaderTopBanner } from '../header/header_top_banner';
import { ScreenReaderRouteAnnouncements, SkipToMainContent } from '../header/screen_reader_a11y';
import { AppMenuBar } from './app_menu';
import { ProjectNavigation } from './navigation';
import { BreadcrumbsWithExtensionsWrapper } from '../header/breadcrumbs_with_extensions';
import { useChromeObservable } from '../../store';

const getHeaderCss = ({ size, colors }: EuiThemeComputed) => ({
  logo: {
    container: css`
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 56px; /* 56 = 40 + 8 + 8 */
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
  leftNavcontrols: css`
    .navcontrols__separator {
      display: flex;
      margin-right: ${size.xs};
      &:after {
        background: ${colors.lightShade};
        content: '';
        flex-shrink: 0;
        margin-block-start: ${size.xs};
        margin-block-end: 0;
        margin-inline: ${size.s};
        block-size: 16px;
        inline-size: 1px;
        transform: translateY(-1px) rotate(15deg);
      }
    }
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
    closeNavAriaLabel: i18n.translate('core.ui.primaryNav.project.toggleNavAriaLabel', {
      defaultMessage: 'Toggle primary navigation',
    }),
  },
};

export interface Props extends Pick<ComponentProps<typeof HeaderHelpMenu>, 'isServerless'> {
  includesActionMenu?: boolean;
  includesHeaderBanner?: boolean;

  docLinks: DocLinksStart;
  children: React.ReactNode;
  kibanaVersion: string;
  application: InternalApplicationStart;
  prependBasePath: (url: string) => string;
  toggleSideNav: (isCollapsed: boolean) => void;
  isFixed?: boolean;
  as?: 'div' | 'header';
}

type LogoProps = Pick<Props, 'application' | 'prependBasePath'> & {
  logoCss: HeaderCss['logo'];
};

const Logo = ({ prependBasePath, application, logoCss }: LogoProps) => {
  const isLoading = useChromeObservable(
    (state) =>
      state.loadingCount$.pipe(
        map((count) => count > 0),
        distinctUntilChanged(),
        debounceTime(250) // Debounce to avoid flickering
      ),
    false
  );
  const homeHref = useChromeObservable((state) => state.homeHref$);
  const customBranding = useChromeObservable((state) => state.customBranding$, {});
  const { logo } = customBranding;

  let fullHref: string | undefined;
  if (homeHref) {
    fullHref = prependBasePath(homeHref);
  }

  const navigateHome = useCallback(
    (event: React.MouseEvent) => {
      if (fullHref) {
        application.navigateToUrl(fullHref);
      }
      event.preventDefault();
    },
    [fullHref, application]
  );

  const renderLogo = () => {
    if (logo) {
      return (
        <a href={fullHref} onClick={navigateHome} data-test-subj="globalLoadingIndicator-hidden">
          <EuiImage
            src={logo}
            css={logoCss}
            data-test-subj="globalLoadingIndicator-hidden customLogo"
            size={24}
            alt="logo"
            aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.customLogoAriaLabel', {
              defaultMessage: 'User logo',
            })}
          />
        </a>
      );
    }

    return (
      <EuiHeaderLogo
        iconType="logoElastic"
        onClick={navigateHome}
        href={fullHref}
        css={logoCss}
        data-test-subj="globalLoadingIndicator-hidden"
        aria-label={headerStrings.logo.ariaLabel}
      />
    );
  };

  return (
    <span css={logoCss.container} data-test-subj="nav-header-logo">
      {!isLoading ? (
        renderLogo()
      ) : (
        <a onClick={navigateHome} href={fullHref} css={logoCss.spinner}>
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
  isServerless,
  includesActionMenu,
  includesHeaderBanner,
  isFixed = true,
  as = 'header',
}: Props) => {
  const { euiTheme } = useEuiTheme();

  const navControlsCenter = useChromeObservable((state) => state.navControlsCenter$);
  const navControlsLeft = useChromeObservable((state) => state.navControlsLeft$);
  const navControlsRight = useChromeObservable((state) => state.navControlsRight$);
  const projectBreadcrumbs = useChromeObservable((state) => state.projectBreadcrumbs$, []);
  const isSideNavCollapsed = useChromeObservable((state) => state.isSideNavCollapsed$, false);

  const headerCss = getHeaderCss(euiTheme);
  const { logo: logoCss } = headerCss;

  const HeaderElement = as === 'header' ? 'header' : 'div';

  return (
    <>
      <ScreenReaderRouteAnnouncements breadcrumbs={projectBreadcrumbs} />
      <SkipToMainContent />

      {includesHeaderBanner && <HeaderTopBanner />}
      <HeaderElement data-test-subj="kibanaProjectHeader">
        <div id="globalHeaderBars" data-test-subj="headerGlobalNav" className="header__bars">
          <EuiHeader position={isFixed ? 'fixed' : 'static'} className="header__firstBar">
            <EuiHeaderSection grow={false} css={headerCss.leftHeaderSection}>
              {children && (
                <Router history={application.history}>
                  <ProjectNavigation
                    isSideNavCollapsed={isSideNavCollapsed}
                    toggleSideNav={toggleSideNav}
                  >
                    {children}
                  </ProjectNavigation>
                </Router>
              )}

              <EuiHeaderSectionItem>
                <Logo
                  prependBasePath={prependBasePath}
                  application={application}
                  logoCss={logoCss}
                />
              </EuiHeaderSectionItem>

              <EuiHeaderSectionItem css={headerCss.leftNavcontrols}>
                <HeaderNavControls
                  side="left"
                  navControls={navControlsLeft}
                  append={<div className="navcontrols__separator" />}
                />
              </EuiHeaderSectionItem>

              <EuiHeaderSectionItem css={headerCss.breadcrumbsSectionItem}>
                <RedirectAppLinks
                  coreStart={{ application }}
                  css={headerCss.redirectAppLinksContainer}
                >
                  <BreadcrumbsWithExtensionsWrapper>
                    <Breadcrumbs breadcrumbs={projectBreadcrumbs} />
                  </BreadcrumbsWithExtensionsWrapper>
                </RedirectAppLinks>
              </EuiHeaderSectionItem>
            </EuiHeaderSection>

            <EuiHeaderSection side="right">
              <EuiHeaderSectionItem>
                <HeaderNavControls navControls={navControlsCenter} />
              </EuiHeaderSectionItem>

              <EuiHeaderSectionItem>
                <HeaderHelpMenu
                  isServerless={isServerless}
                  kibanaDocLink={docLinks.links.elasticStackGetStarted}
                  docLinks={docLinks}
                  kibanaVersion={kibanaVersion}
                  navigateToUrl={application.navigateToUrl}
                />
              </EuiHeaderSectionItem>

              <EuiHeaderSectionItem
                css={css`
                  gap: ${euiTheme.size.s};
                `}
              >
                <HeaderNavControls navControls={navControlsRight} />
              </EuiHeaderSectionItem>
            </EuiHeaderSection>
          </EuiHeader>
        </div>
      </HeaderElement>

      {includesActionMenu && <AppMenuBar isFixed={true} />}
    </>
  );
};
