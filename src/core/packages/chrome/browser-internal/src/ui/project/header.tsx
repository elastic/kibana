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
  EuiButtonIcon,
  EuiContextMenu,
  EuiHeader,
  EuiHeaderLinks,
  EuiHeaderLogo,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiImage,
  EuiLoadingSpinner,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type {
  ChromeBreadcrumb,
  ChromeGlobalHelpExtensionMenuLink,
  ChromeHeaderAppActionsConfig,
  ChromeHelpExtension,
  ChromeHelpMenuLink,
  ChromeNavControl,
} from '@kbn/core-chrome-browser/src';
import { type ChromeBreadcrumbsAppendExtension } from '@kbn/core-chrome-browser/src';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import React, { type ComponentProps, useCallback, useState } from 'react';
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

    [data-test-subj="breadcrumbs"] [aria-current="page"] {
      font-weight: 600;
    }
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

const overflowMenuCss = css`
  width: 240px;
`;

/** POC: toolbar styles for secondary actions (mirrored from kbn-unified-data-table render_custom_toolbar controlGroup / controlGroupIconButton). */
const getSecondaryToolbarCss = ({ euiTheme }: { euiTheme: EuiThemeComputed }) => ({
  controlGroup:
    euiTheme &&
    css({
      position: 'relative',
      overflow: 'hidden',
      // borderRadius: euiTheme.border.radius.small,
      display: 'inline-flex',
      alignItems: 'stretch',
      flexDirection: 'row',

      '&::after': {
        content: '""',
        position: 'absolute',
        inset: 0,
        // border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
        // borderRadius: 'inherit',
        pointerEvents: 'none',
      },

      '& .headerAppActionsSecondaryToolbarControlIconButton .euiButtonIcon': {
        // borderRadius: 0,
        border: 'none',
      },

      // '& .headerAppActionsSecondaryToolbarControlIconButton + .headerAppActionsSecondaryToolbarControlIconButton':
      //   {
      //     borderInlineStart: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
      //   },

      // /* Divider between multiple buttons inside one wrapper (e.g. Dashboard Share + Exit) */
      // '& .euiButtonIcon + .euiButtonIcon': {
      //   borderInlineStart: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
      // },
    }),
  controlGroupIconButton:
    euiTheme &&
    css({
      '.euiToolTipAnchor .euiButtonIcon, .euiButtonIcon': {
        inlineSize: '28px',
        blockSize: '28px',
        minWidth: '28px',
        minHeight: '28px',
        // borderRadius: 'inherit',

        '&:hover, &:active, &:focus': {
          background: 'transparent',
          animation: 'none !important',
          transform: 'none !important',
        },
      },
    }),
});

const GlobalHeaderAppActionsFromConfig: React.FC<{ config: ChromeHeaderAppActionsConfig }> = ({
  config,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const hasOverflow = config.overflowPanels && config.overflowPanels.length > 0;
  const secondaryToolbarCss = getSecondaryToolbarCss({ euiTheme });
  const hasSecondaryActions =
    config.secondaryActions && config.secondaryActions.length > 0;
  const showToolbar = hasSecondaryActions || hasOverflow;

  const overflowButton = (
    <EuiButtonIcon
      color="text"
      iconType="boxesVertical"
      aria-label="More actions"
      onClick={() => setIsOverflowOpen(!isOverflowOpen)}
      data-test-subj="headerGlobalNav-appActionsOverflowButton"
    />
  );

  return (
    <EuiHeaderLinks gutterSize="xs" popoverBreakpoints="none">
      {showToolbar && (
        <div
          className="headerAppActionsSecondaryToolbarControlGroup"
          css={secondaryToolbarCss.controlGroup}
          data-test-subj="headerGlobalNav-appActionsSecondaryToolbar"
        >
          {config.secondaryActions?.map((action, index) => (
            <div
              key={index}
              className="headerAppActionsSecondaryToolbarControlIconButton"
              css={secondaryToolbarCss.controlGroupIconButton}
            >
              {action}
            </div>
          ))}
          {hasOverflow && (
            <div
              className="headerAppActionsSecondaryToolbarControlIconButton"
              css={secondaryToolbarCss.controlGroupIconButton}
            >
              <EuiPopover
                button={overflowButton}
                isOpen={isOverflowOpen}
                closePopover={() => setIsOverflowOpen(false)}
                anchorPosition="downLeft"
                panelPaddingSize="none"
              >
                <EuiContextMenu
                  css={overflowMenuCss}
                  size="s"
                  panels={config.overflowPanels as ComponentProps<typeof EuiContextMenu>['panels']}
                  initialPanelId={0}
                />
              </EuiPopover>
            </div>
          )}
        </div>
      )}
      {config.primaryActions?.map((action, index) => (
        <React.Fragment key={index}>{action}</React.Fragment>
      ))}
    </EuiHeaderLinks>
  );
};

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
  headerAppActionsConfig$: Observable<ChromeHeaderAppActionsConfig | undefined>;
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
  const headerAppActionsConfig = useObservable(observables.headerAppActionsConfig$, undefined);

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

            {headerAppActionsConfig && (
              <EuiHeaderSection grow={false} css={{ paddingInline: euiTheme.size.s }}>
                <EuiHeaderSectionItem>
                  <GlobalHeaderAppActionsFromConfig config={headerAppActionsConfig} />
                </EuiHeaderSectionItem>
              </EuiHeaderSection>
            )}

            <EuiHeaderSection side="right">
              <EuiHeaderSectionItem>
                <HeaderNavControls navControls$={observables.navControlsCenter$} />
              </EuiHeaderSectionItem>

              {/* Global header prototype: Help menu hidden (Docs/Feedback in overflow)
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
              */}

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
