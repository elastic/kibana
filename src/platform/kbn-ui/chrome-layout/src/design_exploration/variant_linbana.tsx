/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';
import { layoutVarName } from '@kbn/ui-chrome-layout-constants';
import {
  DASHBOARD_CONTAINER_SELECTOR,
  DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR,
  DESIGN_EXPLORATION_GAP,
  DESIGN_EXPLORATION_PADDING,
  DESIGN_EXPLORATION_PADDING_COMPACT,
  DESIGN_EXPLORATION_SCROLLED_BODY_ATTR,
  designExplorationVariantScope,
} from './design_exploration_shared';

export const LINBANA_VARIANT_ID = 'linbana';

// Linbana leans almost entirely on flat 1px borders + a subtle background-color
// step (sidebar vs. content) rather than blur/shadow for elevation. Radii are
// noticeably smaller and more uniform than Vercel's, and there is no
// glassmorphism anywhere in the chrome.
const LINEAR_RADIUS_CONTROL = 8; // inputs, nav selection pill
const LINEAR_RADIUS_BUTTON = 16; // buttons
const LINEAR_RADIUS_PANEL = 10; // cards, panels, code viewer
const LINEAR_RADIUS_PANEL_COMPACT = 8; // compact single-stat / metric panels
const LINEAR_ACCENT = '#5E6AD2'; // primary button / focus accent
const LINEAR_SURFACE = 'lch(98.94 0.5 282)'; // content / header surface
const LINEAR_SURFACE_NAV = 'lch(96.5 0.5 282)'; // nav step off content surface
const LINEAR_PANEL_PADDING = DESIGN_EXPLORATION_PADDING_COMPACT + 4;
const LINEAR_PADDING = 20;
const LINEAR_TOP_BAR_HEIGHT = 56;

export const createLinbanaStyles = (euiTheme: UseEuiTheme) => {
  const scope = designExplorationVariantScope(LINBANA_VARIANT_ID);
  const { colors } = euiTheme.euiTheme;

  // Single shared hairline — whisper, not a line — used for panels, controls,
  // headers, and dividers throughout this variant.
  const LINEAR_HAIRLINE = `1px solid color-mix(in srgb, ${colors.borderBaseSubdued} 70%, transparent)`;

  return css`
    // ${scope} {
    //   ${layoutVarName('application.marginRight')}: 0px !important;
    // }

    /* ----- Base surfaces ----- */
    /* Content area reads as pure white; the color *step* against the nav
       does the work of separating regions, not a stroke. */
    ${scope} [class*='css-'][class*='-euiPageSection-grow-l-top-plain'],
    ${scope} [class*='css-'][class*='-euiPageInner-panelled'] {
      background-color: ${colors.backgroundBasePlain} !important;
      box-shadow: none !important;
      border: none !important;
    }

    /* Sidebar / nav gets the cool, slightly darker step off white. */
    ${scope} .kbnChromeLayoutNavigation {
      background-color: ${LINEAR_SURFACE_NAV} !important;
      border-inline-end: none !important;
    }

    ${scope} .kbnChromeLayoutHeader {
      background-color: ${LINEAR_SURFACE_NAV} !important;
      // border-block-end: ${LINEAR_HAIRLINE} !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
    }

    ${scope} [class*='css-'][class*='-global_header_shell--rightGroup'] {
      gap: 2px !important;
    }

    ${scope} [data-test-subj='chromeNextGlobalHeaderActions'] {
      display: none !important;
    }

    /* ----- Dashboard grid & panels ----- */
    ${scope} [data-test-subj='kbnGridLayout'] {
      --kbnGridGutterSize: 8 !important;
      padding: ${DESIGN_EXPLORATION_PADDING}px 20px !important;
    }

    /* Flat border, small consistent radius, no shadow at all. */
    ${scope} [data-test-subj='embeddablePanel'] {
      border-radius: ${LINEAR_RADIUS_PANEL}px !important;
      border: ${LINEAR_HAIRLINE} !important;
      box-shadow: none !important;
    }

    ${scope} [data-test-subj='embeddablePanel']:has(.echMetricText) {
      border-radius: ${LINEAR_RADIUS_PANEL_COMPACT}px !important;
    }

    ${scope}
    [class*='css-'][class*='use_hover_actions_styles--containerStyles-use_hover_actions_styles--singleWrapperStyles-use_hover_actions_styles--singleWrapperStyles-use_hover_actions_styles--hoverActionStyles-use_hover_actions_styles--containerStyles']
      .embPanel {
      outline: none !important;
    }

    ${scope} [data-test-subj='embeddablePanel'] [data-test-subj='dashboardPanelTitle'] {
      height: 44px !important;
      overflow: visible !important;
      line-height: normal !important;
      align-items: center !important;
      font-weight: 500 !important;
      padding-inline: calc(${DESIGN_EXPLORATION_GAP}px + 4px) !important;
    }

    ${scope} [data-test-subj='embeddablePanelTitle'] {
      padding-left: 4px !important;
    }

    ${scope} [class*='css-'][class*='react_expression_renderer--ReactExpressionRenderer'],
    ${scope} [class*='css-'][class*='visualization_container--VisualizationContainer'] {
      padding: 0 ${LINEAR_PANEL_PADDING}px ${LINEAR_PANEL_PADDING}px !important;
    }

    ${scope} [class*='css-'][class*='react_expression_renderer--ReactExpressionRenderer']:has(.echMetricText),
    ${scope} [class*='css-'][class*='visualization_container--VisualizationContainer']:has(.echMetricText) {
      padding: ${LINEAR_PANEL_PADDING}px ${DESIGN_EXPLORATION_GAP}px ${DESIGN_EXPLORATION_GAP}px !important;
    }

    /* ----- Form controls ----- */
    /* Same flat-border language as panels, smaller radius, no shadow.
       Focus state swaps the border color to the accent instead of adding
       elevation. */
    ${scope} .euiFormControlLayout:not(.euiFormControlLayout--group):not(:has(:invalid, [aria-invalid='true'])):not(:has(:disabled)) {
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      background-color: ${colors.backgroundBasePlain} !important;
    }

    ${scope} .euiFormControlLayout:not(.euiFormControlLayout--group):focus-within:not(:has(:invalid, [aria-invalid='true'])) {
      border: 1px solid ${LINEAR_ACCENT} !important;
      /* box-shadow: 0 0 0 1px ${LINEAR_ACCENT}33 !important; — faux border; LINEAR_HAIRLINE + accent border suffice */
    }

    ${scope}
    .euiFormControlLayout:not(.euiFormControlLayout--group):not(:has(:invalid, [aria-invalid='true']))
      input:not(:focus):not(:disabled),
    ${scope}
      .euiFormControlLayout:not(.euiFormControlLayout--group):not(:has(:invalid, [aria-invalid='true']))
      select:not(:focus):not(:disabled),
    ${scope}
      .euiFormControlLayout:not(.euiFormControlLayout--group):not(:has(:invalid, [aria-invalid='true']))
      textarea:not(:focus):not(:disabled),
    ${scope}
      .euiFormControlLayout--group:not(:focus-within)
      input:not(:focus):not(:disabled),
    ${scope}
      .euiFormControlLayout--group:not(:focus-within)
      select:not(:focus):not(:disabled),
    ${scope}
      .euiFormControlLayout--group:not(:focus-within)
      textarea:not(:focus):not(:disabled) {
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
      background-color: transparent !important;
    }

    ${scope} .euiFormControlButton:not(:focus):not(:disabled):not([aria-invalid='true']),
    ${scope} .euiFilePicker:not(:focus-within):not(.euiFilePicker-isInvalid) {
      // border: ${LINEAR_HAIRLINE} !important;
      border-radius: ${LINEAR_RADIUS_CONTROL}px !important;
      box-shadow: none !important;
      background-color: ${colors.backgroundBasePlain} !important;
    }

    ${scope} .euiFormControlLayout--group:not(:focus-within) {
      overflow: visible !important;
      border: ${LINEAR_HAIRLINE} !important;
      border-radius: ${LINEAR_RADIUS_CONTROL}px !important;
      box-shadow: none !important;
    }

    ${scope} .euiFormControlLayout--group:not(:focus-within)::after {
      border: none !important;
      box-shadow: none !important;
    }

    /* Primary / accent buttons: flat indigo fill, no gradient, no border. */
    ${scope} [class*='css-'][class*='-euiButtonDisplay'][class*='fill'] {
      border: none !important;
      box-shadow: none !important;
    }

    ${scope} .euiSplitButtonActionPrimary {
      border-radius: ${LINEAR_RADIUS_BUTTON}px 0 0 ${LINEAR_RADIUS_BUTTON}px !important;
      padding-left: 8px !important;
      padding-right: 0 !important;
    }

    ${scope} .euiSplitButtonActionSecondary {
      border-radius: 0 ${LINEAR_RADIUS_BUTTON}px ${LINEAR_RADIUS_BUTTON}px 0 !important;
      padding-right: 2px !important;
    }

    // /* Secondary buttons: white fill, thin border — a quieter twin of primary. */
    // ${scope} [class*='css-'][class*='-euiButtonDisplay']:not([class*='fill']) {
    //   // background-color: ${colors.backgroundBasePlain} !important;
    //   border: ${LINEAR_HAIRLINE} !important;
    //   border-radius: ${LINEAR_RADIUS_CONTROL}px !important;
    //   // box-shadow: none !important;
    // }

    ${scope} [data-test-subj='globalQueryBar'] {
      padding: ${LINEAR_PADDING}px !important;
      padding-block-end: ${DESIGN_EXPLORATION_PADDING_COMPACT}px !important;
    }

    ${scope} [data-test-subj='controls-group-wrapper'] {
      padding: ${LINEAR_PADDING}px !important;
      padding-block-start: 0 !important;
    }

    ${scope}:has(.dshDashboardViewportWrapper--isFullscreen) [data-test-subj='controls-group-wrapper'] {
      padding-top: ${DESIGN_EXPLORATION_PADDING}px !important;
    }

    /* ----- App header ----- */
    /* No floating/blurred header here — Linear's chrome sits flush against
       the content, flat and static, no scroll-triggered elevation change. */
    ${scope}:has([data-test-subj='dashboardContainer'], #dashboardListingHeading)
      [data-test-subj='appHeader'] {
      padding-inline: ${LINEAR_PADDING}px !important;
      padding-block: 4px !important;
      margin-inline: 0 !important;
      margin-top: 0 !important;
      border-radius: 0 !important;
      border: none !important;
      border-block-end: ${LINEAR_HAIRLINE} !important;
      box-shadow: none !important;
      background-color: ${LINEAR_SURFACE} !important;
    }

    ${scope} [data-test-subj='appHeader'] [data-test-subj='appHeaderTitle'],
    ${scope} .echMetricText__title > span {
      font-size: 14px !important;
      font-weight: 500 !important;
    }

    ${scope} .echMetricText {
      padding: 0 !important;
    }

    ${scope} .echMetricText__title > span,
    ${scope} .echMetricText__subtitle {
      padding-left: 4px !important;
    }

    ${scope} .echMetricText__subtitle {
      color: ${colors.textSubdued} !important;
      font-size: 12px !important;
      font-weight: 400 !important;
      padding-top: 2px !important;
    }

    ${scope} [data-test-subj='appHeader'] [class*='css-'][class*='-euiButtonDisplay'][class*='app_menu_action_button--buttonCss'] {
      background-color: transparent !important;
      border-radius: ${LINEAR_RADIUS_BUTTON}px !important;
    }

    ${scope} [data-test-subj='appHeader'] [data-test-subj^='app-menu-action-button-']:hover
      [class*='app_menu_action_button--buttonCss'],
    ${scope} [data-test-subj='appHeader'] [data-test-subj^='app-menu-action-button-']:focus
      [class*='app_menu_action_button--buttonCss'] {
      background-color: transparent !important;
      border-radius: ${LINEAR_RADIUS_BUTTON}px !important;
    }

    ${scope} .kbnChromeLayoutApplication:has([data-test-subj='appHeader']) {
      --kbn-application--top-bar-height: ${LINEAR_TOP_BAR_HEIGHT}px !important;
      border-radius: ${LINEAR_RADIUS_CONTROL}px !important;
      border: ${LINEAR_HAIRLINE} !important;
    }

    ${scope}:has(${DASHBOARD_CONTAINER_SELECTOR}) .kbnChromeLayoutApplication > div:has([data-test-subj='appHeader']) {
      height: ${LINEAR_TOP_BAR_HEIGHT}px !important;
      opacity: 1;
      overflow: visible !important;
      transition: opacity 200ms ease !important;
    }

    /* Header stays flat and pinned — no margin/backdrop/radius change on
       scroll, unlike Verbana's floating glass bar. */
    ${scope} .kbnChromeLayoutApplication div:has(> [data-test-subj='appHeader']) {
      width: 100% !important;
      margin: 0 !important;
      min-height: 48px !important;
    }

    ${scope} .kbnChromeLayoutApplication {
      background-color: ${LINEAR_SURFACE} !important;
      box-shadow: none !important;
      outline: none !important;
      margin-right: 8px !important;
    }

    ${scope} .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      top: ${LINEAR_TOP_BAR_HEIGHT}px !important;
      width: 100% !important;
      background-color: transparent !important;
      backdrop-filter: none !important;
      margin-inline: 0 !important;
      -webkit-backdrop-filter: none !important;
      border: none !important;
      border-block-end: ${LINEAR_HAIRLINE} !important;
      box-shadow: none !important;
      transition: none !important;
    }

    ${scope}[${DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR}='true']:has(${DASHBOARD_CONTAINER_SELECTOR})
      .kbnChromeLayoutApplication:has([data-test-subj='appHeader']) {
      --kbn-application--top-bar-height: 0px !important;
      --kbn-application--sticky-headers-offset: 0px !important;
      --kbnAppHeadersOffset: 0px !important;
    }

    ${scope}[${DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR}='true']:has(${DASHBOARD_CONTAINER_SELECTOR})
      .kbnChromeLayoutApplication > div:has([data-test-subj='appHeader']) {
      height: 0 !important;
      opacity: 0 !important;
      overflow: hidden !important;
      pointer-events: none !important;
    }

    ${scope}[${DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR}='true']:has(${DASHBOARD_CONTAINER_SELECTOR})
      .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      top: 0 !important;
    }

    /* No scroll-triggered background/blur/radius change — deliberately
       inert compared to Verbana's DESIGN_EXPLORATION_SCROLLED_BODY_ATTR
       treatment, since Linear's chrome doesn't float. */
    ${scope}[${DESIGN_EXPLORATION_SCROLLED_BODY_ATTR}='true']
      .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      width: 100% !important;
      margin: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      background-color: ${colors.backgroundBasePlain} !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    ${scope} .dshDashboardViewportWrapper,
    ${scope} .dshDashboardViewportWrapper--defaultBg {
      background-color: transparent !important;
    }
  `;
};
