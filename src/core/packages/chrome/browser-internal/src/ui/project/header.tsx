/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiHeader,
  EuiHeaderLogo,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiImage,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type {
  ChromeBreadcrumb,
  ChromeGlobalHelpExtensionMenuLink,
  ChromeHelpExtension,
  ChromeHelpMenuLink,
  ChromeNavControl,
} from '@kbn/core-chrome-browser/src';
import { type ChromeBreadcrumbsAppendExtension } from '@kbn/core-chrome-browser/src';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import React, { type ComponentProps, useCallback } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';
import { debounceTime } from 'rxjs';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import { Breadcrumbs } from './breadcrumbs';
import { HeaderHelpMenu } from '../header/header_help_menu';
import { HeaderNavControls } from '../header/header_nav_controls';
import { BreadcrumbsWithExtensionsWrapper } from '../header/breadcrumbs_with_extensions';
import { HeaderPageAnnouncer } from '../header/header_page_announcer';

const getHeaderCss = ({ size, colors }: EuiThemeComputed) => ({
  logo: {
    container: css`
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: ${size.xxl};
      cursor: pointer;
    `,
    logo: css`
      min-width: 0; /* overrides min-width: 40px */
      padding: 0;
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
  breadcrumbs$: Observable<ChromeBreadcrumb[]>;
  breadcrumbsAppendExtensions$: Observable<ChromeBreadcrumbsAppendExtension[]>;
  docLinks: DocLinksStart;
  customBranding$: Observable<CustomBranding>;
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
}

const LOADING_DEBOUNCE_TIME = 80;

type LogoProps = Pick<
  Props,
  'application' | 'homeHref$' | 'loadingCount$' | 'prependBasePath' | 'customBranding$'
> & {
  logoCss: HeaderCss['logo'];
};

const Logo = ({
  loadingCount$,
  homeHref$,
  prependBasePath,
  application,
  logoCss,
  customBranding$,
}: LogoProps) => {
  const loadingCount = useObservable(loadingCount$.pipe(debounceTime(LOADING_DEBOUNCE_TIME)), 0);
  const homeHref = useObservable(homeHref$, '/app/home');
  const customBranding = useObservable(customBranding$, {});
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
      {loadingCount === 0 ? (
        renderLogo()
      ) : (
        <a onClick={navigateHome} href={fullHref}>
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
  prependBasePath,
  docLinks,
  customBranding$,
  isServerless,
  breadcrumbsAppendExtensions$,
  ...observables
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const headerCss = getHeaderCss(euiTheme);
  const { logo: logoCss } = headerCss;

  const topBarStyles = () => css`
    box-shadow: none !important;
    background-color: ${euiTheme.colors.backgroundTransparent};
    border-bottom-color: ${euiTheme.colors.backgroundTransparent};
    padding-inline: 4px 8px;
  `;

  return (
    <>
      <header data-test-subj="kibanaProjectHeader">
        <div id="globalHeaderBars" data-test-subj="headerGlobalNav" className="header__bars">
          <EuiHeader position={'static'} className="header__firstBar" css={topBarStyles}>
            <EuiHeaderSection grow={false} css={headerCss.leftHeaderSection}>
              <EuiHeaderSectionItem>
                <HeaderPageAnnouncer
                  breadcrumbs$={observables.breadcrumbs$}
                  customBranding$={customBranding$}
                />
                <Logo
                  prependBasePath={prependBasePath}
                  application={application}
                  homeHref$={observables.homeHref$}
                  loadingCount$={observables.loadingCount$}
                  customBranding$={customBranding$}
                  logoCss={logoCss}
                />
              </EuiHeaderSectionItem>

              <EuiHeaderSectionItem css={headerCss.leftNavcontrols}>
                <HeaderNavControls
                  side="left"
                  navControls$={observables.navControlsLeft$}
                  append={<div className="navcontrols__separator" />}
                />
              </EuiHeaderSectionItem>

              <EuiHeaderSectionItem css={headerCss.breadcrumbsSectionItem}>
                <BreadcrumbsWithExtensionsWrapper
                  breadcrumbsAppendExtensions$={breadcrumbsAppendExtensions$}
                >
                  <Breadcrumbs breadcrumbs$={observables.breadcrumbs$} />
                </BreadcrumbsWithExtensionsWrapper>
              </EuiHeaderSectionItem>
            </EuiHeaderSection>

            <EuiHeaderSection side="right">
              <EuiHeaderSectionItem>
                <HeaderNavControls navControls$={observables.navControlsCenter$} />
              </EuiHeaderSectionItem>

              <EuiHeaderSectionItem>
                <HeaderHelpMenu
                  isServerless={isServerless}
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

              <EuiHeaderSectionItem
                css={css`
                  gap: ${euiTheme.size.s};
                `}
              >
                <HeaderNavControls navControls$={observables.navControlsRight$} />
              </EuiHeaderSectionItem>
            </EuiHeaderSection>
          </EuiHeader>
        </div>
      </header>
    </>
  );
};
