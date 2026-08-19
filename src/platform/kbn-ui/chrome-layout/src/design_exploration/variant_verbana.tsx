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
  DESIGN_EXPLORATION_BORDER_WIDTH,
  DESIGN_EXPLORATION_GAP,
  DESIGN_EXPLORATION_SCROLLED_BODY_ATTR,
  DESIGN_EXPLORATION_TOP_BAR_HEIGHT,
  designExplorationVariantScope,
  getEmbeddablePanelShadow,
} from './design_exploration_shared';
import { designExplorationKnobVar as knobVar } from './design_exploration_knobs';

export const VERBANA_VARIANT_ID = 'verbana';

export const createVerbanaStyles = (euiTheme: UseEuiTheme) => {
  const scope = designExplorationVariantScope(VERBANA_VARIANT_ID);
  const { colors, levels } = euiTheme.euiTheme;
  const isDarkMode = euiTheme.colorMode === 'DARK';
  const appHeaderStackZIndex = Number(levels.mask) + 1;
  const embeddablePanelShadow = getEmbeddablePanelShadow(euiTheme);
  const verbanaCanvas = isDarkMode ? colors.backgroundBaseSubdued : knobVar('canvas');
  const verbanaGlassNav = isDarkMode ? colors.backgroundBaseSubdued : knobVar('surfaceNav');
  const verbanaGlassSurface = isDarkMode ? colors.backgroundBasePlain : knobVar('surface');
  const verbanaShellShadow = isDarkMode ? embeddablePanelShadow : knobVar('shellShadow');

  return css`
    ${scope} {
      background-color: ${verbanaCanvas} !important;
      ${layoutVarName('application.marginRight')}: 0px !important;
    }

    ${scope} [class*='css-'][class*='-euiPageSection-grow-l-top-plain'],
    ${scope} [class*='css-'][class*='-euiPageInner-panelled'] {
      background-color: transparent !important;
      box-shadow: none !important;
    }

    ${scope} [data-test-subj='kbnGridLayout'] {
      --kbnGridGutterSize: ${knobVar('gridGutter')} !important;
      padding: ${knobVar('padding')} !important;
    }

    ${scope} [data-test-subj='embeddablePanel'] {
      border-radius: ${knobVar('radiusPanel')} !important;
      border: none !important;
      box-shadow: ${embeddablePanelShadow} !important;
    }

    ${scope} [data-test-subj='embeddablePanel'] [data-test-subj='dashboardPanelTitle'] {
      height: 48px !important;
      overflow: visible !important;
      line-height: normal !important;
      align-items: center !important;
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

    ${scope} .euiFormControlLayout:not(.euiFormControlLayout--group):not(:focus-within):not(:has(:invalid, [aria-invalid='true'])):not(:has(:disabled)) {
      border: none !important;
      border-radius: calc(${knobVar('radiusControl')} * 0.5) !important;
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
      padding: ${knobVar('panelPadding')} !important;
      padding-bottom: ${DESIGN_EXPLORATION_GAP}px !important;
    }

    ${scope} [data-test-subj='controls-group-wrapper'] {
      padding-inline: ${knobVar('panelPadding')} !important;
      padding-bottom: ${knobVar('panelPadding')} !important;
    }

    ${scope}:has(.dshDashboardViewportWrapper--isFullscreen) [data-test-subj='controls-group-wrapper'] {
      padding-top: ${knobVar('padding')} !important;
    }

    ${scope}:has([data-test-subj='dashboardContainer'], #dashboardListingHeading)
      [data-test-subj='appHeader'] {
      padding-inline: ${knobVar('panelPadding')} !important;
      padding-block: 4px !important;
      margin-inline: 0 !important;
      margin-top: 0 !important;
      border-radius: ${knobVar('radiusControl')} !important;
      border: none !important;
      box-shadow: ${embeddablePanelShadow} !important;
    }

    ${scope} [data-test-subj='appHeader'] [data-test-subj='appHeaderTitle'],
    ${scope} .echMetricText__title > span {
      font-size: 14px !important;
      font-weight: 500 !important;
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
    }

    ${scope} [data-test-subj='appHeader'] [data-test-subj^='app-menu-action-button-']:hover
      [class*='app_menu_action_button--buttonCss'],
    ${scope} [data-test-subj='appHeader'] [data-test-subj^='app-menu-action-button-']:focus
      [class*='app_menu_action_button--buttonCss'] {
      background-color: transparent !important;
    }

    ${scope} .kbnChromeLayoutApplication:has([data-test-subj='appHeader']) {
      --kbn-application--top-bar-height: ${DESIGN_EXPLORATION_TOP_BAR_HEIGHT}px !important;
    }

    ${scope}:has(${DASHBOARD_CONTAINER_SELECTOR}) .kbnChromeLayoutApplication > div:has([data-test-subj='appHeader']) {
      height: ${DESIGN_EXPLORATION_TOP_BAR_HEIGHT}px !important;
      opacity: 1;
      overflow: visible !important;
      z-index: ${appHeaderStackZIndex} !important;
      transition: opacity 250ms ease !important;
    }

    ${scope}:has(${DASHBOARD_CONTAINER_SELECTOR})
      .kbnChromeLayoutApplication div:has(> [data-test-subj='appHeader']) {
      position: relative;
      z-index: ${appHeaderStackZIndex} !important;
    }

    ${scope} .kbnChromeLayoutApplication div:has(> [data-test-subj='appHeader']) [data-test-subj='appHeader'] {
      border-radius: ${knobVar('radiusControl')} !important;
      border: none !important;
      box-shadow: ${verbanaShellShadow} !important;
      background-color: color-mix(
        in srgb,
        ${verbanaGlassNav} 80%,
        transparent
      ) !important;
      backdrop-filter: blur(10px) !important;
      -webkit-backdrop-filter: blur(10px) !important;
    }

    ${scope} .kbnChromeLayoutApplication div:has(> [data-test-subj='appHeader']) {
      width: calc(100% - ${knobVar('padding')}) !important;
      margin: 8px !important;
      min-height: 48px !important;
    }

    ${scope} .kbnChromeLayoutApplication {
      background-color: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      outline: none !important;
    }

    ${scope} .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      top: ${DESIGN_EXPLORATION_TOP_BAR_HEIGHT}px !important;
      width: calc(100% - 16px) !important;
      background: transparent !important;
      background-color: transparent !important;
      backdrop-filter: none !important;
      margin-inline: ${DESIGN_EXPLORATION_GAP}px !important;
      -webkit-backdrop-filter: none !important;
      border: none !important;
      box-shadow: none !important;
      transition: top 250ms ease, width 200ms ease, margin 200ms ease, background-color 200ms ease,
        backdrop-filter 200ms ease, box-shadow 200ms ease !important;
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
      top: ${DESIGN_EXPLORATION_GAP}px !important;
    }

    ${scope}[${DESIGN_EXPLORATION_SCROLLED_BODY_ATTR}='true']
      .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      width: calc(100% - ${knobVar('padding')}) !important;
      margin: ${knobVar('padding')} 8px !important;
      border-radius: ${knobVar('radiusControl')} !important;
      box-shadow: ${verbanaShellShadow} !important;
      background-color: color-mix(
        in srgb,
        ${verbanaGlassSurface} 75%,
        transparent
      ) !important;
      backdrop-filter: blur(10px) !important;
      -webkit-backdrop-filter: blur(10px) !important;
    }

    ${scope}:has(.dshDashboardViewportWrapper--isFullscreen)[${DESIGN_EXPLORATION_SCROLLED_BODY_ATTR}='true']
      .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      border-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope} .dshDashboardViewportWrapper,
    ${scope} .dshDashboardViewportWrapper--defaultBg {
      background-color: transparent !important;
    }

    ${scope} .kbnChromeLayoutNavigation {
      border-inline-end: ${DESIGN_EXPLORATION_BORDER_WIDTH}px solid ${colors.borderBaseSubdued} !important;
    }
  `;
};
