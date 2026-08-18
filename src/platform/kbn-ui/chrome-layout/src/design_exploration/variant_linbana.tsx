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
import {
  DASHBOARD_CONTAINER_SELECTOR,
  DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR,
  DESIGN_EXPLORATION_GAP,
  DESIGN_EXPLORATION_PADDING,
  DESIGN_EXPLORATION_PADDING_COMPACT,
  DESIGN_EXPLORATION_SCROLLED_BODY_ATTR,
  designExplorationVariantScope,
} from './design_exploration_shared';
import { designExplorationKnobVar as knobVar } from './design_exploration_knobs';

export const LINBANA_VARIANT_ID = 'linbana';

// Linbana leans almost entirely on flat 1px borders + a subtle background-color
// step (sidebar vs. content) rather than blur/shadow for elevation. Radii are
// noticeably smaller and more uniform than Vercel's, and there is no
// glassmorphism anywhere in the chrome.
const LINEAR_ACCENT = '#5E6AD2'; // primary button / focus accent
const LINEAR_TOP_BAR_HEIGHT = 57;
const LINEAR_APP_HEADER_TRANSITION_MS = 200;

export const createLinbanaStyles = (euiTheme: UseEuiTheme) => {
  const scope = designExplorationVariantScope(LINBANA_VARIANT_ID);
  const { colors } = euiTheme.euiTheme;

  // Single shared hairline — whisper, not a line — used for panels, controls,
  // headers, and dividers throughout this variant.
  const LINEAR_HAIRLINE = `1px solid color-mix(in srgb, ${colors.borderBaseSubdued} 70%, transparent)`;

  return css`
    ${scope} {
      background-color: ${knobVar('canvas')} !important;
    }

    /* ----- Base surfaces ----- */
    /* Content area reads as pure white; the color *step* against the nav
       does the work of separating regions, not a stroke. */
    ${scope} [class*='css-'][class*='-euiPageSection-grow-l-top-plain'],
    ${scope} [class*='css-'][class*='-euiPageInner-panelled'] {
      background-color: ${knobVar('surface')} !important;
      box-shadow: none !important;
      border: none !important;
    }

    /* Sidebar / nav gets the cool, slightly darker step off white. */
    ${scope} .kbnChromeLayoutNavigation {
      background-color: ${knobVar('surfaceNav')} !important;
      border-inline-end: none !important;
    }

    /* ----- Dashboard grid & panels ----- */
    ${scope} [data-test-subj='kbnGridLayout'] {
      --kbnGridGutterSize: ${knobVar('gridGutter')} !important;
      padding: ${knobVar('padding')} !important;
    }

    /* Flat border, small consistent radius, no shadow at all. */
    ${scope} [data-test-subj='embeddablePanel'] {
      border-radius: ${knobVar('radiusPanel')} !important;
      border: ${LINEAR_HAIRLINE} !important;
      box-shadow: none !important;
      background-color: ${knobVar('surface')} !important;
    }

    ${scope} [data-test-subj='embeddablePanel']:has(.echMetricText) {
      border-radius: ${knobVar('radiusPanelCompact')} !important;
    }

    ${scope} .echChartBackground,
    ${scope} .echMetric,
    ${scope} .euiDataGridRow,
    ${scope} .euiFormControlLayout:not(.euiFormControlLayout--group):not(:has(:invalid, [aria-invalid='true'])):not(:has(:disabled)),
    ${scope} [class*='css-'][class*='-control_panel--formControl'],
    ${scope} .euiFormControlButton:not(:focus):not(:disabled):not([aria-invalid='true']) {
      background-color: ${knobVar('surface')} !important;
    }

    ${scope} [class*='css-'][class*='-control_panel--formControl'] {
      border: ${LINEAR_HAIRLINE} !important;
      border-radius: ${knobVar('radiusControl')} !important;
      box-shadow: none !important;
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

    /* Exclude .euiProgress: its css prop is Emotion-labeled from the same file. */
    ${scope} [class*='css-'][class*='react_expression_renderer--ReactExpressionRenderer']:not(.euiProgress),
    ${scope} [class*='css-'][class*='visualization_container--VisualizationContainer']:not(.euiProgress) {
      padding: 0 ${knobVar('panelPadding')} ${knobVar('panelPadding')} !important;
    }

    ${scope} [class*='css-'][class*='react_expression_renderer--ReactExpressionRenderer']:not(.euiProgress):has(.echMetricText),
    ${scope} [class*='css-'][class*='visualization_container--VisualizationContainer']:not(.euiProgress):has(.echMetricText) {
      padding: ${knobVar('panelPadding')} ${DESIGN_EXPLORATION_GAP}px ${DESIGN_EXPLORATION_GAP}px !important;
    }

    /* ----- Form controls ----- */
    /* Same flat-border language as panels, smaller radius, no shadow.
       Focus state swaps the border color to the accent instead of adding
       elevation. */
    ${scope} .euiFormControlLayout:not(.euiFormControlLayout--group):not(:has(:invalid, [aria-invalid='true'])):not(:has(:disabled)) {
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
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

    ${scope} .euiFormControlButton:not(:focus):not(:disabled):not([aria-invalid='true']) {
      border: none !important;
      border-radius: ${knobVar('radiusControl')} !important;
      box-shadow: none !important;
    }

    ${scope} .euiFilePicker:not(:focus-within):not(.euiFilePicker-isInvalid) {
      border-radius: ${knobVar('radiusControl')} !important;
      box-shadow: none !important;
      background-color: ${knobVar('surface')} !important;
    }

    ${scope} .euiFormControlLayout--group:not(:focus-within) {
      overflow: visible !important;
      border: ${LINEAR_HAIRLINE} !important;
      border-radius: ${knobVar('radiusControl')} !important;
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
      border-radius: ${knobVar('radiusButton')} 0 0 ${knobVar('radiusButton')} !important;
      padding-left: 8px !important;
      padding-right: 0 !important;
    }

    ${scope} .euiSplitButtonActionSecondary {
      border-radius: 0 ${knobVar('radiusButton')} ${knobVar('radiusButton')} 0 !important;
      padding-right: 2px !important;
    }

    // /* Secondary buttons: white fill, thin border — a quieter twin of primary. */
    // ${scope} [class*='css-'][class*='-euiButtonDisplay']:not([class*='fill']) {
    //   // background-color: ${colors.backgroundBasePlain} !important;
    //   border: ${LINEAR_HAIRLINE} !important;
    //   border-radius: ${knobVar('radiusControl')} !important;
    //   // box-shadow: none !important;
    // }

    ${scope} [data-test-subj='globalQueryBar'] {
      padding: ${knobVar('padding')} !important;
      padding-block-end: ${DESIGN_EXPLORATION_PADDING_COMPACT}px !important;
    }

    ${scope}
    .euiFormControlLayout:has([data-test-subj='queryInput'], [data-test-subj='dateRangePickerControlButton']):not(:focus-within):not(:has(:invalid, [aria-invalid='true'])) {
      border: ${LINEAR_HAIRLINE} !important;
      border-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope}
    .euiFormControlLayout:has([data-test-subj='queryInput'], [data-test-subj='dateRangePickerControlButton']):focus-within:not(:has(:invalid, [aria-invalid='true'])) {
      border: 1px solid ${LINEAR_ACCENT} !important;
    }

    ${scope} [data-test-subj='controls-group-wrapper'] {
      padding: ${knobVar('padding')} !important;
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
      padding-inline: ${knobVar('padding')} !important;
      padding-block: 4px !important;
      margin-inline: 0 !important;
      margin-top: 0 !important;
      border-radius: 0 !important;
      border: none !important;
      border-block-end: ${LINEAR_HAIRLINE} !important;
      box-shadow: none !important;
      background-color: ${knobVar('surface')} !important;
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
      border-radius: ${knobVar('radiusButton')} !important;
    }

    ${scope} [data-test-subj='appHeader'] [data-test-subj^='app-menu-action-button-']:hover
      [class*='app_menu_action_button--buttonCss'],
    ${scope} [data-test-subj='appHeader'] [data-test-subj^='app-menu-action-button-']:focus
      [class*='app_menu_action_button--buttonCss'] {
      background-color: transparent !important;
      border-radius: ${knobVar('radiusButton')} !important;
    }

    ${scope} .kbnChromeLayoutApplication:has([data-test-subj='appHeader']) {
      --kbn-application--top-bar-height: ${LINEAR_TOP_BAR_HEIGHT}px !important;
      border-radius: ${knobVar('radiusControl')} !important;
      border: ${LINEAR_HAIRLINE} !important;
    }

    /* Opaque topBar shell — never faded — so scroll content cannot bleed through on reveal. */
    ${scope}:has(${DASHBOARD_CONTAINER_SELECTOR}) .kbnChromeLayoutApplication > div:has([data-test-subj='appHeader']) {
      height: ${LINEAR_TOP_BAR_HEIGHT}px !important;
      min-height: 0 !important;
      opacity: 1 !important;
      overflow: hidden !important;
      background-color: ${knobVar('surface')} !important;
      transition: height ${LINEAR_APP_HEADER_TRANSITION_MS}ms ease !important;
    }

    ${scope}:has(${DASHBOARD_CONTAINER_SELECTOR}) [data-test-subj='appHeader'] {
      opacity: 1 !important;
      position: relative !important;
      top: auto !important;
    }

    ${scope}:has(${DASHBOARD_CONTAINER_SELECTOR}) [data-test-subj='appHeader'] > div {
      opacity: 1;
      transition: opacity ${LINEAR_APP_HEADER_TRANSITION_MS}ms ease
        ${LINEAR_APP_HEADER_TRANSITION_MS}ms !important;
    }

    /* Header stays flat and pinned — no margin/backdrop/radius change on
       scroll, unlike Verbana's floating glass bar. */
    ${scope} .kbnChromeLayoutApplication div:has(> [data-test-subj='appHeader']) {
      width: 100% !important;
      margin: 0 !important;
      min-height: 48px !important;
    }

    ${scope} .kbnChromeLayoutApplication {
      background-color: ${knobVar('surface')} !important;
      border-radius: ${knobVar('radiusControl')} !important;
      box-shadow: ${knobVar('shellShadow')} !important;
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
      transition: top ${LINEAR_APP_HEADER_TRANSITION_MS}ms ease !important;
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
      min-height: 0 !important;
      overflow: hidden !important;
      pointer-events: none !important;
      transition: height ${LINEAR_APP_HEADER_TRANSITION_MS}ms ease
        ${LINEAR_APP_HEADER_TRANSITION_MS}ms !important;
    }

    ${scope}[${DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR}='true']:has(${DASHBOARD_CONTAINER_SELECTOR})
      [data-test-subj='appHeader'] > div {
      opacity: 0 !important;
      pointer-events: none !important;
      transition: opacity ${LINEAR_APP_HEADER_TRANSITION_MS}ms ease !important;
    }

    ${scope}[${DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR}='true']:has(${DASHBOARD_CONTAINER_SELECTOR})
      .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      top: 0 !important;
      transition: top ${LINEAR_APP_HEADER_TRANSITION_MS}ms ease ${LINEAR_APP_HEADER_TRANSITION_MS}ms !important;
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
      background-color: ${knobVar('surface')} !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    ${scope} .dshDashboardViewportWrapper,
    ${scope} .dshDashboardViewportWrapper--defaultBg {
      background-color: transparent !important;
    }
  `;
};
