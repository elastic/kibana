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
import { designExplorationKnobVar as knobVar } from './design_exploration_knobs';

export const ATTBANA_VARIANT_ID = 'attbana';

// Attbana starts from Linbana — flat 1px borders + a subtle background-color
// step (sidebar vs. content) rather than blur/shadow for elevation. Radii are
// noticeably smaller and more uniform than Vercel's, and there is no
// glassmorphism anywhere in the chrome.
const LINEAR_ACCENT = '#5E6AD2'; // primary button / focus accent
const LINEAR_TOP_BAR_HEIGHT = 57;
const LINEAR_APP_HEADER_TRANSITION_MS = 200;
const ATTBANA_NAV_EXPANDED_WIDTH = 220;
const ATTBANA_NAV_WIDE_WIDTH = 468;

const ATTBANA_NAV_EXPANDED_SELECTOR = `[data-test-subj='sideNavCollapseButton'][aria-pressed='true']`;

/** Chrome layout grid root — first column width comes from React, not CSS vars alone. */
const CHROME_LAYOUT_GRID_SELECTOR = `div:has(> [data-test-subj='kbnChromeLayoutNavigation']):has(> [data-test-subj='kbnChromeLayoutApplication'])`;

const attbanaApplicationWidthCalc = (navWidth: number) =>
  `calc(100vw - ${navWidth}px - var(${layoutVarName('application.right')}))`;

const attbanaNavLayoutOverrides = (navWidth: number) => {
  const applicationWidth = attbanaApplicationWidthCalc(navWidth);

  return `
  ${layoutVarName('navigation.width')}: ${navWidth}px !important;
  ${layoutVarName('navigation.right')}: calc(100vw - ${navWidth}px) !important;
  ${layoutVarName('application.left')}: ${navWidth}px !important;
  ${layoutVarName('application.width')}: ${applicationWidth} !important;
  ${layoutVarName('application.topBar.left')}: ${navWidth}px !important;
  ${layoutVarName('application.topBar.width')}: ${applicationWidth} !important;
  ${layoutVarName('application.bottomBar.left')}: ${navWidth}px !important;
  ${layoutVarName('application.bottomBar.width')}: ${applicationWidth} !important;
  ${layoutVarName('application.content.left')}: ${navWidth}px !important;
  ${layoutVarName('application.content.width')}: ${applicationWidth} !important;
`;
};

const attbanaGridTemplateColumns = (navWidth: number) =>
  `${navWidth}px 1fr var(${layoutVarName('sidebar.width')}, 0px)`;

export const createAttbanaStyles = (euiTheme: UseEuiTheme) => {
  const scope = designExplorationVariantScope(ATTBANA_VARIANT_ID);
  const { colors } = euiTheme.euiTheme;

  // Single shared hairline — whisper, not a line — used for panels, controls,
  // headers, and dividers throughout this variant.
  const LINEAR_HAIRLINE = `1px solid color-mix(in srgb, ${colors.borderBaseSubdued} 70%, transparent)`;

  return css`
    ${scope} {
      background-color: ${knobVar('canvas')} !important;
      ${layoutVarName('application.marginTop')}: 8px !important;
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

    /* ----- Attbana expanded nav — layout width + grid column sync ----- */
    /* Nav draws wider than the default 100px column; push the workspace by
       updating both CSS layout vars and the grid's inline column template. */
    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR}) {
      ${attbanaNavLayoutOverrides(ATTBANA_NAV_EXPANDED_WIDTH)}
    }

    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR}) ${CHROME_LAYOUT_GRID_SELECTOR} {
      grid-template-columns: ${attbanaGridTemplateColumns(ATTBANA_NAV_EXPANDED_WIDTH)} !important;
    }

    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR}):has(.kbnChromeNav-sidePanel) {
      ${attbanaNavLayoutOverrides(ATTBANA_NAV_WIDE_WIDTH)}
    }

    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR}):has(.kbnChromeNav-sidePanel)
      ${CHROME_LAYOUT_GRID_SELECTOR} {
      grid-template-columns: ${attbanaGridTemplateColumns(ATTBANA_NAV_WIDE_WIDTH)} !important;
    }

    /* ----- Attbana expanded nav — Linear-style primary rail ----- */

    ${scope} .kbnChromeNav-root:has(${ATTBANA_NAV_EXPANDED_SELECTOR}) {
      width: ${ATTBANA_NAV_EXPANDED_WIDTH}px !important;
      flex-shrink: 0 !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-primaryNavigation'] {
      align-items: stretch !important;
      gap: 2px !important;
      padding-inline: ${DESIGN_EXPLORATION_GAP}px !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-primaryNavigation']
    > [class*='wrapperStyles'] {
      display: flex !important;
      flex-direction: row !important;
      align-items: flex-start !important;
      justify-content: flex-start !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-primaryNavigation']
    > [class*='wrapperStyles']
    > .euiPopover {
      width: 100% !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-primaryNavigation']
    [data-menu-item='true'] {
      flex-direction: row !important;
      justify-content: flex-start !important;
      align-items: center !important;
      gap: ${DESIGN_EXPLORATION_GAP}px !important;
      width: 100% !important;
      padding: 6px 10px !important;
      border-radius: ${knobVar('radiusControl')} !important;
      min-height: 32px !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-primaryNavigation']
    [data-menu-item='true']
    .kbnChromeNav-iconWrapper {
      flex-shrink: 0 !important;
      height: 16px !important;
      width: 16px !important;
      background-color: transparent !important;
      border-radius: 0 !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-primaryNavigation']
    [data-menu-item='true']
    .kbnChromeNav-iconWrapper::before {
      display: none !important;
    }

    ${scope} [class*='css-'][class*='-new_item_indicator--styles'] {
      right: auto !important;
      left: 16px !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-primaryNavigation']
    [data-menu-item='true']
    .kbnChromeNav-iconWrapper
    [data-euiicon-type] {
      width: 16px !important;
      height: 16px !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-primaryNavigation']
    [data-menu-item='true']
    > .euiText {
      flex: 1 !important;
      min-width: 0 !important;
      padding: 0 !important;
      text-align: start !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      line-height: 1.2 !important;
      white-space: nowrap !important;
      text-overflow: ellipsis !important;
      overflow: hidden !important;
      display: block !important;
      -webkit-line-clamp: unset !important;
      line-clamp: unset !important;
      -webkit-box-orient: unset !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-primaryNavigation']
    [data-menu-item='true'][data-highlighted='true'] {
      --menu-item-text-color: ${colors.textParagraph} !important;
      background-color: color-mix(in srgb, ${colors.textParagraph} 8%, transparent) !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-primaryNavigation']
    [data-menu-item='true'][data-highlighted='false']:hover {
      background-color: color-mix(in srgb, ${colors.textParagraph} 5%, transparent) !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-primaryNavigation']
    [data-menu-item='true']:focus-visible {
      outline: 2px solid ${LINEAR_ACCENT} !important;
      outline-offset: -2px !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-primaryNavigation']
    [data-menu-item='true']:focus-visible
    .kbnChromeNav-iconWrapper {
      border: none !important;
    }

    /* ----- Attbana expanded nav — footer labels ----- */
    /* Footer items are icon-only; label text comes from data-footer-label on the
       item wrapper (see FooterItem) rendered here via ::after. */
    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR}) [data-test-subj='kbnChromeNav-footer'] {
      align-items: stretch !important;
      gap: 2px !important;
      padding-inline: ${DESIGN_EXPLORATION_GAP}px !important;
    }

    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      > div:not(.sideNavCollapseButtonWrapper),
    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .euiPopover,
    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .euiToolTipAnchor {
      width: 100% !important;
      justify-content: flex-start !important;
    }

    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label] {
      --menu-item-text-color: ${colors.textParagraph};
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: flex-start !important;
      gap: ${DESIGN_EXPLORATION_GAP}px !important;
      width: 100% !important;
      min-height: 32px !important;
      border-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]::after {
      content: attr(data-footer-label) !important;
      flex: 1 1 auto !important;
      min-width: 0 !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      line-height: 1.2 !important;
      text-align: start !important;
      white-space: nowrap !important;
      text-overflow: ellipsis !important;
      overflow: hidden !important;
      color: var(--menu-item-text-color) !important;
    }

    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]
      [data-test-subj^='kbnChromeNav-footerItem-'] {
      flex-shrink: 0 !important;
      width: auto !important;
      min-width: unset !important;
      min-height: unset !important;
      height: auto !important;
      padding: 0 !important;
      background-color: transparent !important;
      overflow: visible !important;
    }

    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]
      .euiButtonIcon__icon,
    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]
      [data-euiicon-type],
    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .sideNavCollapseButtonWrapper[data-footer-label]
      .euiButtonIcon__icon,
    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .sideNavCollapseButtonWrapper[data-footer-label]
      [data-euiicon-type] {
      width: 16px !important;
      height: 16px !important;
    }

    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]:has([data-highlighted='true']) {
      background-color: color-mix(in srgb, ${colors.textParagraph} 8%, transparent) !important;
    }

    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]:has([data-highlighted='false']:hover) {
      background-color: color-mix(in srgb, ${colors.textParagraph} 5%, transparent) !important;
    }

    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]:has([data-test-subj^='kbnChromeNav-footerItem-']:focus-visible) {
      outline: 2px solid ${LINEAR_ACCENT} !important;
      outline-offset: -2px !important;
    }

    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .sideNavCollapseButtonWrapper[data-footer-label]
      .euiToolTipAnchor {
      width: auto !important;
      flex-shrink: 0 !important;
      padding-inline: ${DESIGN_EXPLORATION_GAP}px !important;
    }

    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .sideNavCollapseButtonWrapper[data-footer-label]
      [data-test-subj='sideNavCollapseButton'] {
      flex-shrink: 0 !important;
      width: auto !important;
      min-width: unset !important;
      min-height: unset !important;
      height: auto !important;
      padding: 0 !important;
      background-color: transparent !important;
    }

    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .sideNavCollapseButtonWrapper[data-footer-label]:has([data-test-subj='sideNavCollapseButton']:hover) {
      background-color: color-mix(in srgb, ${colors.textParagraph} 5%, transparent) !important;
    }

    ${scope}:has(${ATTBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .sideNavCollapseButtonWrapper[data-footer-label]:has([data-test-subj='sideNavCollapseButton']:focus-visible) {
      outline: 2px solid ${LINEAR_ACCENT} !important;
      outline-offset: -2px !important;
    }

    /* Full-width nav footer hairline (default high-contrast separators are 32px centered). */
    ${scope} [data-test-subj='kbnChromeNav-footer']::before {
      width: 100% !important;
      left: 0 !important;
      right: 0 !important;
      margin: 0 !important;
    }

    ${scope} [data-test-subj='kbnChromeNav-footer'] [class*='collapseDivider'] {
      display: none !important;
    }

    ${scope} [class*='css-'][class*='-navigation--topSeparatorStyles']::after {
      display: none !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-logo'] {
      flex-direction: row !important;
      justify-content: flex-start !important;
      align-items: center !important;
      gap: ${DESIGN_EXPLORATION_GAP}px !important;
      width: 100% !important;
      padding: 6px 10px !important;
      margin-inline: ${DESIGN_EXPLORATION_GAP}px !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-logo']
    .kbnChromeNav-iconWrapper {
      height: 20px !important;
      width: 20px !important;
      background-color: transparent !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-logo']
    .kbnChromeNav-iconWrapper::before {
      display: none !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-logo']
    > .euiText {
      text-align: start !important;
      padding: 0 !important;
      font-size: 14px !important;
      font-weight: 600 !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    .kbnChromeNav-sidePanel {
      background-color: ${knobVar('surfaceNav')} !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      outline: none !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    .kbnChromeNav-sidePanel
    [data-test-subj^='kbnChromeNav-sidePanelItem-'] {
      border-radius: ${knobVar('radiusControl')} !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      padding-inline-start: 28px !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    .kbnChromeNav-sidePanel
    [data-test-subj^='kbnChromeNav-sidePanelItem-'][data-highlighted='true'] {
      background-color: color-mix(in srgb, ${colors.textParagraph} 8%, transparent) !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    .kbnChromeNav-sidePanel
    [data-test-subj^='kbnChromeNav-sidePanelItem-'][data-highlighted='false']:hover {
      background-color: color-mix(in srgb, ${colors.textParagraph} 5%, transparent) !important;
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
