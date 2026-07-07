/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { Global, css } from '@emotion/react';
import { useEuiTheme, type UseEuiTheme } from '@elastic/eui';
import { getScrollContainer } from '@kbn/ui-chrome-layout-utils';

/** Gutter between chrome panels. */
export const DESIGN_EXPLORATION_GAP = 8;

/** Border radius for chrome panel containers. */
export const DESIGN_EXPLORATION_RADIUS_CONTAINER = 12;

/** Border radius for buttons and inputs inside chrome panels. */
export const DESIGN_EXPLORATION_RADIUS_CONTROL = 8;

/** Hairline outline on panel containers. */
export const DESIGN_EXPLORATION_BORDER_WIDTH = 0.5;

/** Default inner padding for nav panel content. */
export const DESIGN_EXPLORATION_PADDING = 16;

/** Compact inner padding for tighter chrome regions. */
export const DESIGN_EXPLORATION_PADDING_COMPACT = 12;

/** Application top bar slot height when Chrome app header is shown. */
export const DESIGN_EXPLORATION_TOP_BAR_HEIGHT = 64;

export const DESIGN_EXPLORATION_BODY_ATTR = 'data-design-exploration';

/** Set on body when the app scroll container (ancestor of `.kbnAppWrapper`) has scrolled. */
export const DESIGN_EXPLORATION_SCROLLED_BODY_ATTR = 'data-design-exploration-scrolled';

const panelSelectorList = [
  '.kbnChromeLayoutNavigation',
  '.kbnChromeLayoutApplication',
  '.kbnChromeNav-sidePanel',
];

/** Body scope prefix for design exploration overrides. */
export const designExplorationScope = () => `body[${DESIGN_EXPLORATION_BODY_ATTR}='true']`;

/** Scope descendant selectors to each chrome panel under the design exploration body attr. */
export const designExplorationScopedInPanels = (selectors: string) => {
  const scope = designExplorationScope();

  return selectors
    .split(', ')
    .flatMap((selector) => panelSelectorList.map((panel) => `${scope} ${panel} ${selector}`))
    .join(', ');
};

const designExplorationChromeStyles = (euiTheme: UseEuiTheme) => {
  const scope = designExplorationScope();
  const { colors } = euiTheme.euiTheme;
  const isDarkMode = euiTheme.colorMode === 'DARK';
  const embeddablePanelShadow = isDarkMode
    ? `0 0 0 1px color-mix(in srgb, ${colors.borderBaseSubdued} 45%, transparent), 0 2px 4px rgba(0, 0, 0, 0.28)`
    : `0 0 0 1px rgba(0, 0, 0, 0.08), 0 2px 2px rgba(0, 0, 0, 0.04), inset 0 1px 0 0 rgba(255, 255, 255, 0.55)`;
  const formControlBorder = isDarkMode
    ? `color-mix(in srgb, ${colors.borderBaseSubdued} 35%, transparent)`
    : `color-mix(in srgb, ${colors.borderBaseSubdued} 50%, transparent)`;
  const formControlBorderHover = isDarkMode
    ? `color-mix(in srgb, ${colors.borderBaseSubdued} 55%, transparent)`
    : `color-mix(in srgb, ${colors.borderBaseSubdued} 75%, transparent)`;
  const scrolledBarBorderRadius = `0 0 ${DESIGN_EXPLORATION_RADIUS_CONTROL}px ${DESIGN_EXPLORATION_RADIUS_CONTROL}px`;

  return css`
    ${scope} [data-test-subj='kbnGridLayout'] {
      --kbnGridGutterSize: 12 !important;
      padding: ${DESIGN_EXPLORATION_PADDING}px !important;
    }

    ${scope} [data-test-subj='embeddablePanel'] {
      border-radius: ${DESIGN_EXPLORATION_RADIUS_CONTROL}px !important;
      border: none !important;
      box-shadow: ${embeddablePanelShadow} !important;
    }

    ${scope} [data-test-subj='dashboardPanelTitle'] {
      padding-top: ${DESIGN_EXPLORATION_GAP}px !important;
    }

    ${scope} [data-test-subj='embeddablePanelTitle'] {
      padding-left: 4px !important;
    }

    ${scope} .euiFormControlLayout:not(.euiFormControlLayout--group):not(:focus-within):not(:has(:invalid, [aria-invalid='true'])):not(:has(:disabled)) {
      border: none !important;
      border-radius: calc(${DESIGN_EXPLORATION_RADIUS_CONTROL}px * 0.5) !important;
      box-shadow: ${embeddablePanelShadow} !important;
    }

    ${scope}
      .euiFormControlLayout:not(.euiFormControlLayout--group):not(:focus-within):not(:has(:invalid, [aria-invalid='true']))
      input:not(:focus):not(:disabled),
    ${scope}
      .euiFormControlLayout:not(.euiFormControlLayout--group):not(:focus-within):not(:has(:invalid, [aria-invalid='true']))
      select:not(:focus):not(:disabled),
    ${scope}
      .euiFormControlLayout:not(.euiFormControlLayout--group):not(:focus-within):not(:has(:invalid, [aria-invalid='true']))
      textarea:not(:focus):not(:disabled),
    ${scope}
      .euiFormControlLayout:not(.euiFormControlLayout--group):not(:focus-within):not(:has(:invalid, [aria-invalid='true']))
      .euiFormControlLayout__childrenWrapper:not(:has(:focus, .euiPopover-isOpen)),
    ${scope}
      .euiFormControlLayout:not(.euiFormControlLayout--group):not(:focus-within):not(:has(:invalid, [aria-invalid='true']))
      .euiFormControlButton:not(:focus):not(:disabled),
    ${scope}
      .euiFormControlLayout--group:not(:focus-within)
      input:not(:focus):not(:disabled),
    ${scope}
      .euiFormControlLayout--group:not(:focus-within)
      select:not(:focus):not(:disabled),
    ${scope}
      .euiFormControlLayout--group:not(:focus-within)
      textarea:not(:focus):not(:disabled),
    ${scope}
      .euiFormControlLayout--group:not(:focus-within)
      .euiFormControlLayout__childrenWrapper:not(:has(:focus, .euiPopover-isOpen)),
    ${scope}
      .euiFormControlLayout--group:not(:focus-within)
      .euiFormControlButton:not(:focus):not(:disabled) {
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
    }

    ${scope} .euiFormControlButton:not(:focus):not(:disabled):not([aria-invalid='true']),
    ${scope} .euiFilePicker:not(:focus-within):not(.euiFilePicker-isInvalid) {
      border: none !important;
      box-shadow: ${embeddablePanelShadow} !important;
    }

    ${scope} .euiFormControlLayout--group:not(:focus-within) {
      overflow: visible !important;
      border: none !important;
      box-shadow: ${embeddablePanelShadow} !important;
    }

    ${scope} .euiFormControlLayout--group:not(:focus-within)::after {
      border: none !important;
      box-shadow: none !important;
    }

    ${scope} .euiFormControlLayout--group:not(:focus-within):hover:not(:has(:disabled, [readOnly])) {
      box-shadow: ${embeddablePanelShadow} !important;
    }

    ${scope} [data-test-subj='globalQueryBar'] {
      padding: ${DESIGN_EXPLORATION_PADDING_COMPACT}px !important;
      padding-bottom: ${DESIGN_EXPLORATION_GAP}px !important;
    }

    ${scope} [data-test-subj='controls-group-wrapper'] {
      padding-inline: ${DESIGN_EXPLORATION_PADDING_COMPACT}px !important;
      padding-bottom: ${DESIGN_EXPLORATION_PADDING_COMPACT}px !important;
    }

    ${scope}:has(.dshDashboardViewportWrapper--isFullscreen) [data-test-subj='controls-group-wrapper'] {
      padding-top: ${DESIGN_EXPLORATION_PADDING}px !important;
    }

    ${scope}:has([data-test-subj='dashboardContainer'], #dashboardListingHeading)
      [data-test-subj='appHeader'] {
      padding-inline: 12px !important;
      padding-block: 4px !important;
      margin-inline: 0 !important;
      margin-top: 0 !important;
      border-radius: ${DESIGN_EXPLORATION_RADIUS_CONTROL}px !important;
      border: none !important;
      box-shadow: ${embeddablePanelShadow} !important;
    }

    ${scope} [data-test-subj='appHeader'] [data-test-subj='appHeaderTitle'] {
      font-size: 14px !important;
      font-weight: 500 !important;
    }

    ${scope} .kbnChromeLayoutApplication:has([data-test-subj='appHeader']) {
      --kbn-application--top-bar-height: ${DESIGN_EXPLORATION_TOP_BAR_HEIGHT}px !important;
    }

    ${scope} .kbnChromeLayoutApplication > div:has([data-test-subj='appHeader']) {
      height: ${DESIGN_EXPLORATION_TOP_BAR_HEIGHT}px !important;
      min-height: ${DESIGN_EXPLORATION_TOP_BAR_HEIGHT}px !important;
    }

    ${scope} .kbnChromeLayoutApplication div:has(> [data-test-subj='appHeader']) [data-test-subj='appHeader'] {
      background-color: color-mix(
        in srgb,
        ${colors.backgroundBasePlain} 75%,
        transparent
      ) !important;
      backdrop-filter: blur(10px) !important;
      -webkit-backdrop-filter: blur(10px) !important;
    }

    ${scope} .kbnChromeLayoutApplication div:has(> [data-test-subj='appHeader']) {
      width: calc(100% - ${DESIGN_EXPLORATION_PADDING * 1}px) !important;
      margin: calc(${DESIGN_EXPLORATION_PADDING}px - 8px) !important;
      min-height: 48px !important;
    }

    ${scope} .kbnChromeLayoutApplication {
      background-color: transparent !important;
      box-shadow: none !important;
      outline: none !important;
    }

    ${scope} .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      top: ${DESIGN_EXPLORATION_TOP_BAR_HEIGHT}px !important;
      width: calc(100% - ${DESIGN_EXPLORATION_PADDING}px) !important;
      background: transparent !important;
      background-color: transparent !important;
      backdrop-filter: none !important;
      margin-inline: ${DESIGN_EXPLORATION_GAP}px !important;
      -webkit-backdrop-filter: none !important;
      border: none !important;
      box-shadow: none !important;
      transition: width 200ms ease, margin 200ms ease, background-color 200ms ease,
        backdrop-filter 200ms ease, box-shadow 200ms ease !important;
    }

    ${scope}[${DESIGN_EXPLORATION_SCROLLED_BODY_ATTR}='true']
      .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      width: calc(100% - ${DESIGN_EXPLORATION_PADDING * 2}px) !important;
      margin: ${DESIGN_EXPLORATION_PADDING}px !important;
      border-radius: ${scrolledBarBorderRadius} !important;
      box-shadow: ${embeddablePanelShadow} !important;
      background-color: color-mix(
        in srgb,
        ${colors.backgroundBasePlain} 75%,
        transparent
      ) !important;
      backdrop-filter: blur(10px) !important;
      -webkit-backdrop-filter: blur(10px) !important;
    }

    ${scope}:has(.dshDashboardViewportWrapper--isFullscreen)[${DESIGN_EXPLORATION_SCROLLED_BODY_ATTR}='true']
      .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      border-radius: ${DESIGN_EXPLORATION_RADIUS_CONTROL}px !important;
    }

    ${scope} .dshDashboardViewportWrapper,
    ${scope} .dshDashboardViewportWrapper--defaultBg {
      background-color: transparent !important;
    }

    ${scope} .kbnChromeLayoutNavigation {
      border-inline-end: ${DESIGN_EXPLORATION_BORDER_WIDTH}px solid ${colors.borderBaseSubdued} !important;
    }

    ${scope} .kbnChromeLayoutHeader {
      border-block-end: ${DESIGN_EXPLORATION_BORDER_WIDTH}px solid ${colors.borderBaseSubdued} !important;
    }
  `;
};

/**
 * Design exploration chrome POC — sets body scope for global style overrides when mounted.
 */
export const DesignExplorationChromeGlobalStyles = () => {
  const euiTheme = useEuiTheme();

  useEffect(() => {
    document.body.setAttribute(DESIGN_EXPLORATION_BODY_ATTR, 'true');

    const scrollContainer = getScrollContainer();
    const updateScrolledState = () => {
      if (scrollContainer.scrollTop > 0) {
        document.body.setAttribute(DESIGN_EXPLORATION_SCROLLED_BODY_ATTR, 'true');
      } else {
        document.body.removeAttribute(DESIGN_EXPLORATION_SCROLLED_BODY_ATTR);
      }
    };

    updateScrolledState();
    scrollContainer.addEventListener('scroll', updateScrolledState, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', updateScrolledState);
      document.body.removeAttribute(DESIGN_EXPLORATION_BODY_ATTR);
      document.body.removeAttribute(DESIGN_EXPLORATION_SCROLLED_BODY_ATTR);
    };
  }, []);

  return <Global styles={designExplorationChromeStyles(euiTheme)} />;
};
