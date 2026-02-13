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
  EuiHorizontalRule,
  EuiIcon,
  EuiImage,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiSplitButton,
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

/** Override EuiKeyPadMenuItem to compact size (72×48) in the overflow popover */
const overflowKeyPadCss = css`
  justify-content: center;
  padding-block: 8px;
`;

const overflowKeyPadItemCss = css`
  width: 72px;
  height: 64px;
  min-width: 72px;
  min-height: 48px;
`;

const overflowMenuCss = css`
  width: 240px;
`;

const saveOverflowMenuCss = css`
  width: 160px;
`;

const noop = () => {};

const ALERTS_PANEL_ID = 1;
const EXPORT_PANEL_ID = 2;

const OverflowKeyPadSection: React.FC = () => (
  <>
    <EuiKeyPadMenu css={overflowKeyPadCss}>
      <EuiKeyPadMenuItem
        label="New"
        onClick={noop}
        css={overflowKeyPadItemCss}
        data-test-subj="headerGlobalNav-overflowNew"
      >
        <EuiIcon type="plusInCircle" size="m" />
      </EuiKeyPadMenuItem>
      <EuiKeyPadMenuItem
        label="Favorite"
        onClick={noop}
        css={overflowKeyPadItemCss}
        data-test-subj="headerGlobalNav-overflowFavorite"
      >
        <EuiIcon type="star" size="m" />
      </EuiKeyPadMenuItem>
      <EuiKeyPadMenuItem
        label="Share"
        onClick={noop}
        css={overflowKeyPadItemCss}
        data-test-subj="headerGlobalNav-overflowShare"
      >
        <EuiIcon type="share" size="m" />
      </EuiKeyPadMenuItem>
    </EuiKeyPadMenu>
    <EuiHorizontalRule margin="none" />
  </>
);

const OVERFLOW_PANELS: Array<
  | {
      id: number;
      title: string;
      content?: never;
      items: Array<
        | { name: string; icon: string; onClick: () => void; panel?: number }
        | { isSeparator: true; key: string }
        | { renderItem: () => React.ReactNode; key?: string }
      >;
    }
  | { id: number; title: string; items: Array<{ name: string; icon: string; onClick: () => void }> }
> = [
  {
    id: 0,
    title: '',
    items: [
      { renderItem: () => <OverflowKeyPadSection />, key: 'keypad' },
      // { isSeparator: true as const, key: 'sep1' },
      { name: 'Open', icon: 'folderOpen', onClick: noop },
      { name: 'Inspect', icon: 'inspect', onClick: noop },
      { name: 'Data sets', icon: 'indexOpen', onClick: noop },
      { name: 'Background searches', icon: 'search', onClick: noop },
      { isSeparator: true as const, key: 'sep2' },
      { name: 'Alerts', icon: 'bell', onClick: noop, panel: ALERTS_PANEL_ID },
      { name: 'Export', icon: 'exportAction', onClick: noop, panel: EXPORT_PANEL_ID },
      { isSeparator: true as const, key: 'sep3' },
      { name: 'Rename', icon: 'pencil', onClick: noop },
      { name: 'Settings', icon: 'gear', onClick: noop },
      { isSeparator: true as const, key: 'sep4' },
      { name: 'Docs', icon: 'documentation', onClick: noop },
      { name: 'Feedback', icon: 'editorComment', onClick: noop },
    ],
  },
  {
    id: ALERTS_PANEL_ID,
    title: 'Alerts',
    items: [
      { name: 'Create search threshold rule', icon: 'bell', onClick: noop },
      { name: 'Manage rules and connectors', icon: 'document', onClick: noop },
    ],
  },
  {
    id: EXPORT_PANEL_ID,
    title: 'Export',
    items: [
      { name: 'CSV', icon: 'calendar', onClick: noop },
      { name: 'Schedule export', icon: 'calendar', onClick: noop },
    ],
  },
];

const GlobalHeaderAppActionsDumb: React.FC = () => {
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [isSavePopoverOpen, setIsSavePopoverOpen] = useState(false);
  const closeSavePopover = () => setIsSavePopoverOpen(false);
  const savePopoverPanels = [
    {
      id: 0,
      title: '',
      items: [
        { name: 'Save as', icon: 'save', onClick: closeSavePopover },
        { name: 'Reset changes', icon: 'editorUndo', onClick: closeSavePopover },
      ],
    },
  ];
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
    <EuiHeaderLinks gutterSize="xxs" popoverBreakpoints="none">
      <EuiPopover
        button={overflowButton}
        isOpen={isOverflowOpen}
        closePopover={() => setIsOverflowOpen(false)}
        anchorPosition="downLeft"
        panelPaddingSize="none"
      >
        <EuiContextMenu css={overflowMenuCss} size="s" panels={OVERFLOW_PANELS} initialPanelId={0} />
      </EuiPopover>
      <EuiButtonIcon size="xs" color="text" iconType="plusInCircle" data-test-subj="headerGlobalNav-appActionsNewButton">
        New
      </EuiButtonIcon>
      <EuiButtonIcon size="xs" color="text" iconType="share" data-test-subj="headerGlobalNav-appActionsShareButton">
        Share
      </EuiButtonIcon>
      <EuiSplitButton
        size="s"
        color="text"
        fill={false}
        data-test-subj="headerGlobalNav-appActionsSaveSplitButton"
        aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.saveAriaLabel', {
          defaultMessage: 'Save',
        })}
      >
        <EuiSplitButton.ActionPrimary
          iconType="save"
          data-test-subj="headerGlobalNav-appActionsSaveButton"
          minWidth={false}
        >
          Save
        </EuiSplitButton.ActionPrimary>
        <EuiPopover
          button={React.cloneElement(
            <EuiSplitButton.ActionSecondary
              iconType="arrowDown"
              aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.saveOptionsAriaLabel', {
                defaultMessage: 'Save options',
              })}
              data-test-subj="headerGlobalNav-appActionsSaveDropdown"
            />,
            { onClick: () => setIsSavePopoverOpen(true) }
          )}
          isOpen={isSavePopoverOpen}
          closePopover={closeSavePopover}
          anchorPosition="downLeft"
          panelPaddingSize="none"
        >
          <EuiContextMenu css={saveOverflowMenuCss} panels={savePopoverPanels} initialPanelId={0} />
        </EuiPopover>
      </EuiSplitButton>
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

            <EuiHeaderSection grow={false}>
              <EuiHeaderSectionItem>
                <GlobalHeaderAppActionsDumb />
              </EuiHeaderSectionItem>
            </EuiHeaderSection>

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
