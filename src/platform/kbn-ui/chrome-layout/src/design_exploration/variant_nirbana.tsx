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
  DASHBOARDS_APP_HAS_SELECTOR,
  DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR,
  DESIGN_EXPLORATION_GAP,
  DESIGN_EXPLORATION_PADDING,
  DESIGN_EXPLORATION_PADDING_COMPACT,
  DESIGN_EXPLORATION_SCROLLED_BODY_ATTR,
  designExplorationVariantScope,
} from './design_exploration_shared';
import { designExplorationKnobVar as knobVar } from './design_exploration_knobs';
import { designExplorationBespokeVar as bespokeVar } from './design_exploration_bespoke_colors';

export const NIRBANA_VARIANT_ID = 'nirbana';

// Nirbana starts as a fork of Interbana (Intercom-influenced). Shares Linbana/Linear's
// flat, shadow-free, hairline-over-blur base, with the same deliberate divergences:
//   - much airier padding/gaps everywhere (toolbar rows, panel internals,
//     gutter between panels)
//   - large, soft radii — buttons read as full capsules/pills, panels use a
//     bigger radius than Linear's crisper 8-10px geometry
//   - far fewer *internal* dividers — separation between individual settings
//     rows/cards comes from generous gap + each card having its own border,
//     not from a shared hairline splitting one container into rows
//   - low size-contrast type scale — panel titles sit much closer in size to
//     body text than Linear's stronger heading/body contrast
//   - canvas vs content contrast — blue-gray canvas (~Intercom #EFF0EB luminance)
//     lifts a true-white app surface; secondary nav side panel gets a subtle shade
//   - warm orange accent instead of Linear's cool indigo
const NIRBANA_ACCENT = '#F26522'; // warm orange accent (est. from reference)
const NIRBANA_SURFACE_APP_LIGHT = '#f7f8f9';
const NIRBANA_SURFACE_APP_DARK = '#10141a'; // soft step above dark canvas
const NIRBANA_TOP_BAR_HEIGHT = 80;
const NIRBANA_APP_HEADER_TRANSITION_MS = 200;
const NIRBANA_NAV_EXPANDED_WIDTH = 220;
const NIRBANA_NAV_WIDE_WIDTH = 468;
const NIRBANA_NAV_COLLAPSED_WIDTH = 56;
const NIRBANA_SIDE_PANEL_WIDTH = 248;
const NIRBANA_NAV_COLLAPSED_WIDE_WIDTH = NIRBANA_NAV_COLLAPSED_WIDTH + NIRBANA_SIDE_PANEL_WIDTH;

const NIRBANA_NAV_EXPANDED_SELECTOR = `[data-test-subj='sideNavCollapseButton'][aria-pressed='true']`;

/** Chrome layout grid root — first column width comes from React, not CSS vars alone. */
const CHROME_LAYOUT_GRID_SELECTOR = `div:has(> [data-test-subj='kbnChromeLayoutNavigation']):has(> [data-test-subj='kbnChromeLayoutApplication'])`;

const nirbanaApplicationWidthCalc = (navWidth: number) =>
  `calc(100vw - ${navWidth}px - var(${layoutVarName('application.right')}))`;

const nirbanaNavLayoutOverrides = (navWidth: number) => {
  const applicationWidth = nirbanaApplicationWidthCalc(navWidth);

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

const nirbanaGridTemplateColumns = (navWidth: number) =>
  `${navWidth}px 1fr var(${layoutVarName('sidebar.width')}, 0px)`;

export const createNirbanaStyles = (euiTheme: UseEuiTheme) => {
  const scope = designExplorationVariantScope(NIRBANA_VARIANT_ID);
  const { colors } = euiTheme.euiTheme;
  const isDarkMode = euiTheme.colorMode === 'DARK';

  // Still a single shared hairline for anywhere a border remains, but it's
  // used far more sparingly than in Linbana — mainly on individual cards and
  // controls, not as internal row dividers within a shared container.
  const NIRBANA_HAIRLINE = `1px solid ${bespokeVar('borderSubdued')}`;
  const NIRBANA_HAIRLINE_INSET_SHADOW = `0 0 0 1px ${bespokeVar('borderSubdued')} inset`;
  const NIRBANA_ACCENT_INSET_SHADOW = `0 0 0 1px ${NIRBANA_ACCENT} inset`;
  const NIRBANA_SURFACE_HOVER_FILL = `color-mix(in srgb, ${colors.textParagraph} 4%, transparent)`;

  return css`
    ${scope} {
      background-color: ${knobVar('canvas')} !important;
    }

    /* ----- Base surfaces ----- */
    /* Canvas (body) is blue-gray; app is white; side panel is a subtle step between them. */
    ${scope} [class*='css-'][class*='-euiPageSection-grow-l-top-plain'],
    ${scope} [class*='css-'][class*='-euiPageInner-'][class*='-panelled'] {
      background-color: ${knobVar('surface')} !important;
      box-shadow: none !important;
      border: none !important;
    }

    ${scope} [class*='css-'][class*='-euiPageSection__content'][class*='-restrictWidth'] {
      max-width: none !important;
    }

    ${scope} h1,
    ${scope} h2,
    ${scope} h3 {
      letter-spacing: -0.1px !important;
    }

    ${scope} [class*='css-'][class*='-euiTable'][class*='-hasBackground-desktop'] {
      background-color: transparent !important;
    }

    ${scope} .euiTableRowCellCheckbox {
      vertical-align: top !important;
      padding-top: 2px !important;
    }

    ${scope} .euiTableCellContent .euiLink[class*='-euiLink-primary'],
    ${scope} .euiTableCellContent [class*='css-'][class*='-euiLink-primary'] {
      color: ${colors.textParagraph} !important;
      font-weight: 500 !important;
    }

    ${scope} .euiTableCellContent .euiText:has([data-test-subj^='dashboardListingTitleLink-']) + .euiText {
      font-size: 12px !important;
    }

    ${scope} .euiTableCellContent .euiButtonIcon[class*='-empty-primary'],
    ${scope} .euiTableCellContent [class*='css-'][class*='-euiButtonIcon-'][class*='-empty-primary'] {
      color: ${colors.textParagraph} !important;
    }

    ${scope} .kbnChromeLayoutNavigation {
      background-color: transparent !important;
      border-inline-end: none !important;
    }

    /* ----- Nirbana collapsed nav — layout width + grid column sync ----- */
    ${scope}:not(:has(${NIRBANA_NAV_EXPANDED_SELECTOR})) {
      ${nirbanaNavLayoutOverrides(NIRBANA_NAV_COLLAPSED_WIDTH)}
    }

    ${scope}:not(:has(${NIRBANA_NAV_EXPANDED_SELECTOR})) ${CHROME_LAYOUT_GRID_SELECTOR} {
      grid-template-columns: ${nirbanaGridTemplateColumns(
        NIRBANA_NAV_COLLAPSED_WIDTH
      )} !important;
    }

    ${scope}:not(:has(${NIRBANA_NAV_EXPANDED_SELECTOR})):has(.kbnChromeNav-sidePanel) {
      ${nirbanaNavLayoutOverrides(NIRBANA_NAV_COLLAPSED_WIDE_WIDTH)}
    }

    ${scope}:not(:has(${NIRBANA_NAV_EXPANDED_SELECTOR})):has(.kbnChromeNav-sidePanel)
      ${CHROME_LAYOUT_GRID_SELECTOR} {
      grid-template-columns: ${nirbanaGridTemplateColumns(
        NIRBANA_NAV_COLLAPSED_WIDE_WIDTH
      )} !important;
    }

    ${scope} .kbnChromeNav-root:not(:has(${NIRBANA_NAV_EXPANDED_SELECTOR})) {
      width: ${NIRBANA_NAV_COLLAPSED_WIDTH}px !important;
      flex-shrink: 0 !important;
    }

    /* ----- Nirbana expanded nav — layout width + grid column sync ----- */
    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR}) {
      ${nirbanaNavLayoutOverrides(NIRBANA_NAV_EXPANDED_WIDTH)}
    }

    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR}) ${CHROME_LAYOUT_GRID_SELECTOR} {
      grid-template-columns: ${nirbanaGridTemplateColumns(
        NIRBANA_NAV_EXPANDED_WIDTH
      )} !important;
    }

    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR}):has(.kbnChromeNav-sidePanel) {
      ${nirbanaNavLayoutOverrides(NIRBANA_NAV_WIDE_WIDTH)}
    }

    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR}):has(.kbnChromeNav-sidePanel)
      ${CHROME_LAYOUT_GRID_SELECTOR} {
      grid-template-columns: ${nirbanaGridTemplateColumns(NIRBANA_NAV_WIDE_WIDTH)} !important;
    }

    /* ----- Nirbana expanded nav — primary rail ----- */
    ${scope} .kbnChromeNav-root:has(${NIRBANA_NAV_EXPANDED_SELECTOR}) {
      width: ${NIRBANA_NAV_EXPANDED_WIDTH}px !important;
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
    [data-menu-item='true'] {
      --menu-item-text-color: ${bespokeVar('textNav')} !important;
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
      outline: 2px solid ${NIRBANA_ACCENT} !important;
      outline-offset: -2px !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-primaryNavigation']
    [data-menu-item='true']:focus-visible
    .kbnChromeNav-iconWrapper {
      border: none !important;
    }

    /* ----- Nirbana expanded nav — footer labels ----- */
    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR}) [data-test-subj='kbnChromeNav-footer'] {
      align-items: stretch !important;
      gap: 2px !important;
      padding-inline: ${DESIGN_EXPLORATION_GAP}px !important;
    }

    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      > div:not(.sideNavCollapseButtonWrapper),
    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .euiPopover,
    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .euiToolTipAnchor {
      width: 100% !important;
      justify-content: flex-start !important;
    }

    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label] {
      --menu-item-text-color: ${bespokeVar('textNav')};
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

    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR})
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

    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR})
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

    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]
      .euiButtonIcon__icon,
    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]
      [data-euiicon-type],
    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .sideNavCollapseButtonWrapper[data-footer-label]
      .euiButtonIcon__icon,
    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .sideNavCollapseButtonWrapper[data-footer-label]
      [data-euiicon-type] {
      width: 16px !important;
      height: 16px !important;
    }

    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]:has([data-highlighted='true']) {
      background-color: color-mix(in srgb, ${colors.textParagraph} 8%, transparent) !important;
    }

    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]:has([data-highlighted='false']:hover) {
      background-color: color-mix(in srgb, ${colors.textParagraph} 5%, transparent) !important;
    }

    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]:has([data-test-subj^='kbnChromeNav-footerItem-']:focus-visible) {
      outline: 2px solid ${NIRBANA_ACCENT} !important;
      outline-offset: -2px !important;
    }

    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .sideNavCollapseButtonWrapper[data-footer-label]
      .euiToolTipAnchor {
      width: auto !important;
      flex-shrink: 0 !important;
      padding-inline: ${DESIGN_EXPLORATION_GAP}px !important;
    }

    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR})
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

    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .sideNavCollapseButtonWrapper[data-footer-label]:has([data-test-subj='sideNavCollapseButton']:hover) {
      background-color: color-mix(in srgb, ${colors.textParagraph} 5%, transparent) !important;
    }

    ${scope}:has(${NIRBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .sideNavCollapseButtonWrapper[data-footer-label]:has([data-test-subj='sideNavCollapseButton']:focus-visible) {
      outline: 2px solid ${NIRBANA_ACCENT} !important;
      outline-offset: -2px !important;
    }

    ${scope} [data-test-subj='kbnChromeNav-footer']::before {
      display: none !important;
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

    /* Side panel is a sibling of the inner SideNav .kbnChromeNav-root, not its
       descendant. Target the panel class / Emotion label directly — works in
       every app, not only Dashboards. */
    ${scope} .kbnChromeNav-sidePanel,
    ${scope} [data-test-subj*='kbnChromeNav-sidePanel'],
    ${scope} [class*='getSidePanelWrapperStyles'] {
      background-color: ${knobVar('surfaceNav')} !important;
      border-radius: ${knobVar('radiusContainer')} !important;
      box-shadow: none !important;
      outline: none !important;
    }

    ${scope} .kbnChromeNav-sidePanel
    [data-test-subj^='kbnChromeNav-sidePanelItem-'],
    ${scope} [data-test-subj*='kbnChromeNav-sidePanel']
      [data-test-subj^='kbnChromeNav-sidePanelItem-'] {
      border-radius: ${knobVar('radiusControl')} !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      padding-inline-start: ${knobVar('padding')} !important;
    }

    ${scope} [class*='css-'][class*='-secondary_menu--titleWithBadgeStyles'],
    ${scope} [class*='css-'][class*='-secondary_menu--titleStyles'] {
      background-color: transparent !important;
      padding-block-start: 30px !important;
      padding-inline: 24px !important;
    }

    ${scope} [class*='css-'][class*='-section--secondaryMenuWrapperStyles'] {
      padding-inline: 16px !important;
    }

    ${scope} [class*='css-'][class*='-section--secondaryMenuWrapperStyles']:not(:last-child)::after {
      display: none !important;
    }

    ${scope} [class*='css-'][class*='-section--labelStyles'] {
      font-size: 11px !important;
      font-weight: 500 !important;
      color: ${bespokeVar('textSubdued')} !important;
      text-transform: uppercase !important;
    }

    ${scope} .kbnChromeNav-sidePanel
    [data-test-subj^='kbnChromeNav-sidePanelItem-'][data-highlighted='true'],
    ${scope} [data-test-subj*='kbnChromeNav-sidePanel']
      [data-test-subj^='kbnChromeNav-sidePanelItem-'][data-highlighted='true'] {
      background-color: color-mix(in srgb, ${colors.textParagraph} 8%, transparent) !important;
    }

    ${scope} .kbnChromeNav-sidePanel
    [data-test-subj^='kbnChromeNav-sidePanelItem-'][data-highlighted='false']:hover,
    ${scope} [data-test-subj*='kbnChromeNav-sidePanel']
      [data-test-subj^='kbnChromeNav-sidePanelItem-'][data-highlighted='false']:hover {
      background-color: color-mix(in srgb, ${colors.textParagraph} 5%, transparent) !important;
    }

    /* ----- Dashboard grid & panels ----- */
    /* Wider gutter than Linbana — panels read as individually-bordered cards
       with generous air between them, rather than tightly packed regions of
       one continuous surface. */
    ${scope} [data-test-subj='kbnGridLayout'] {
      --kbnGridGutterSize: ${knobVar('gridGutter')} !important;
      padding: ${knobVar('padding')} !important;
    }

    /* Larger, softer radius than Linbana; still flat/no-shadow. */
    ${scope} [data-test-subj='embeddablePanel'] {
      border-radius: ${knobVar('radiusPanel')} !important;
      border: ${NIRBANA_HAIRLINE} !important;
      box-shadow: none !important;
      background-color: ${knobVar('surface')} !important;
    }

    ${scope} [data-test-subj='embeddablePanel']:has(.echMetricText) {
      border-radius: ${knobVar('radiusPanelCompact')} !important;
    }

    ${scope} .embPanel__hoverActions,
    ${scope} .embPanel__hoverActions > * {
      border-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope} .embPanel__hoverActionsAnchor {
      border-radius: ${knobVar('radiusControl')} !important;
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
      border: ${NIRBANA_HAIRLINE} !important;
      border-radius: ${knobVar('radiusControl')} !important;
      box-shadow: none !important;
    }

    ${isDarkMode
      ? `
    ${scope} .kbnFilterButtonGroup .euiButtonGroupButton-isIconOnly,
    ${scope} [data-test-subj='dateRangePickerTimeWindowButtons'] .euiButtonGroupButton-isIconOnly,
    ${scope} [class*='css-'][class*='-euiButtonGroupButton-iconOnly'] {
      background-color: ${knobVar('surface')} !important;
    }
    `
      : ''}

    ${scope} .dshLayout--editing .embPanel__header:hover {
      background-color: ${NIRBANA_SURFACE_HOVER_FILL} !important;
    }

    ${scope}
    [class*='css-'][class*='use_hover_actions_styles--containerStyles-use_hover_actions_styles--singleWrapperStyles-use_hover_actions_styles--singleWrapperStyles-use_hover_actions_styles--hoverActionStyles-use_hover_actions_styles--containerStyles']
      .embPanel {
      outline: none !important;
    }

    /* Lower size-contrast panel titles — closer in weight/size to body text
       than Linear's stronger heading/body split, per the Intercom reference. */
    ${scope} [data-test-subj='embeddablePanel'] [data-test-subj='dashboardPanelTitle'] {
      height: 48px !important;
      overflow: visible !important;
      line-height: normal !important;
      align-items: center !important;
      font-weight: 600 !important;
      font-size: 14px !important;
      padding-inline: calc(${DESIGN_EXPLORATION_GAP}px + 8px) !important;
    }

    ${scope} [data-test-subj='embeddablePanelTitle'] {
      padding-left: 4px !important;
      font-weight: 600 !important;
    }

    /* Roomier internal padding than Linbana — content never sits flush
       against the panel border. */
    /* Exclude .euiProgress: its css prop is Emotion-labeled from the same file. */
    ${scope} [class*='css-'][class*='react_expression_renderer--ReactExpressionRenderer']:not(.euiProgress),
    ${scope} [class*='css-'][class*='visualization_container--VisualizationContainer']:not(.euiProgress) {
      padding: 0 ${knobVar('panelPadding')} ${knobVar('panelPadding')} !important;
    }

    ${scope} [class*='css-'][class*='react_expression_renderer--ReactExpressionRenderer']:not(.euiProgress):has(.echMetricText),
    ${scope} [class*='css-'][class*='visualization_container--VisualizationContainer']:not(.euiProgress):has(.echMetricText) {
      padding: ${DESIGN_EXPLORATION_GAP + 8}px ${DESIGN_EXPLORATION_GAP + 4}px
        ${DESIGN_EXPLORATION_GAP + 4}px !important;
    }

    /* ----- Form controls ----- */
    ${scope} .euiFormControlLayout:not(.euiFormControlLayout--group):not(:has(:invalid, [aria-invalid='true'])):not(:has(:disabled)) {
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }

    /* Dashboards listing search — restore hairline (general rule strips borders). */
    ${scope} .euiFormControlLayout:has([data-test-subj='tableListSearchBox']):not(:has(:invalid, [aria-invalid='true'])):not(:has(:disabled)) {
      border: ${NIRBANA_HAIRLINE} !important;
      border-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope} .euiFormControlLayout:not(.euiFormControlLayout--group):focus-within:not(:has(:invalid, [aria-invalid='true'])) {
      border: 1px solid ${NIRBANA_ACCENT} !important;
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
      border: ${NIRBANA_HAIRLINE} !important;
      border-radius: ${knobVar('radiusControl')} !important;
      box-shadow: none !important;
    }

    ${scope} .euiFormControlLayout--group:not(:focus-within)::after {
      border: none !important;
      box-shadow: none !important;
    }

    /* Primary / accent buttons: flat orange fill, no gradient, no border.
       Full capsule radius vs. Linbana's smaller button radius. */
    ${scope} [class*='css-'][class*='-euiButtonDisplay'][class*='fill']:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary) {
      border: none !important;
      box-shadow: none !important;
      border-radius: ${knobVar('radiusButton')} !important;
    }

    ${scope} .euiSplitButtonActionPrimary {
      border-start-start-radius: ${knobVar('radiusButton')} !important;
      border-end-start-radius: ${knobVar('radiusButton')} !important;
      border-start-end-radius: 0 !important;
      border-end-end-radius: 0 !important;
      padding-left: 12px !important;
      padding-right: 0 !important;
    }

    ${scope} .euiSplitButtonActionSecondary {
      border-start-end-radius: ${knobVar('radiusButton')} !important;
      border-end-end-radius: ${knobVar('radiusButton')} !important;
      border-start-start-radius: 0 !important;
      border-end-start-radius: 0 !important;
      padding-right: 4px !important;
    }

    ${scope} [data-test-subj='globalQueryBar'] {
      padding: ${knobVar('padding')} !important;
      padding-block-start: 16px !important;
      padding-block-end: ${DESIGN_EXPLORATION_PADDING_COMPACT}px !important;
    }

    ${scope}
    .euiFormControlLayout:has([data-test-subj='queryInput'], [data-test-subj='dateRangePickerControlButton']):not(:focus-within):not(:has(:invalid, [aria-invalid='true'])) {
      border: none !important;
      border-radius: ${knobVar('radiusControl')} !important;
      box-shadow: ${NIRBANA_HAIRLINE_INSET_SHADOW} !important;
    }

    ${scope}
    .euiFormControlLayout:has([data-test-subj='queryInput'], [data-test-subj='dateRangePickerControlButton']):focus-within:not(:has(:invalid, [aria-invalid='true'])) {
      border: none !important;
      box-shadow: ${NIRBANA_ACCENT_INSET_SHADOW} !important;
    }

    /* Filter bar +/- and menu buttons: match query bar hairline + control radius. */
    ${scope} .kbnFilterButtonGroup {
      border-radius: ${knobVar('radiusControl')} !important;
      overflow: hidden;
      background-color: ${knobVar('surface')} !important;
      width: fit-content;
    }

    ${scope} .kbnFilterButtonGroup::after {
      border: none !important;
      box-shadow: ${NIRBANA_HAIRLINE_INSET_SHADOW} !important;
    }

    ${scope} .kbnFilterButtonGroup > *:not(:last-of-type) {
      border-right: none !important;
    }

    ${scope} .kbnFilterButtonGroup.kbnFilterButtonGroup--attached {
      border-top-right-radius: 0 !important;
      border-bottom-right-radius: 0 !important;
    }

    ${scope} .kbnFilterButtonGroup > .euiFlexItem {
      display: flex;
      flex: 0 0 auto !important;
      flex-direction: column;
      align-items: stretch;
      height: 100%;
      width: auto;
      aspect-ratio: 1;
      align-self: stretch;
      min-width: 0;
      max-width: 100%;
      overflow: hidden;
    }

    /* Add-filter nests three EuiFlexItems before the button — column flex passes height down. */
    ${scope} .kbnFilterButtonGroup > .euiFlexItem .euiFlexItem {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      align-items: stretch;
      align-self: stretch;
      width: 100%;
      height: 100%;
      min-height: 0;
      min-width: 0;
    }

    ${scope} .kbnFilterButtonGroup .euiPopover,
    ${scope} .kbnFilterButtonGroup .euiToolTipAnchor {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      width: 100%;
      height: 100%;
      min-height: 0;
      min-width: 0;
    }

    ${scope} .kbnFilterButtonGroup .euiButtonIcon,
    ${scope} .kbnFilterButtonGroup .euiButtonEmpty,
    ${scope} .kbnFilterButtonGroup [class*='-euiButtonDisplay'] {
      flex: 1 1 auto;
      width: 100%;
      min-width: 0 !important;
      height: auto !important;
      min-height: 100%;
      border-radius: 0 !important;
    }

    ${scope} .kbnFilterButtonGroup > *:first-of-type .euiButtonIcon,
    ${scope} .kbnFilterButtonGroup > *:first-of-type .euiButtonEmpty,
    ${scope} .kbnFilterButtonGroup > *:first-of-type [class*='-euiButtonDisplay'] {
      border-start-start-radius: ${knobVar('radiusControl')} !important;
      border-end-start-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope} .kbnFilterButtonGroup > *:last-of-type .euiButtonIcon,
    ${scope} .kbnFilterButtonGroup > *:last-of-type .euiButtonEmpty,
    ${scope} .kbnFilterButtonGroup > *:last-of-type [class*='-euiButtonDisplay'] {
      border-start-end-radius: ${knobVar('radiusControl')} !important;
      border-end-end-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope} .kbnFilterButtonGroup.kbnFilterButtonGroup--attached > *:last-of-type .euiButtonIcon,
    ${scope} .kbnFilterButtonGroup.kbnFilterButtonGroup--attached > *:last-of-type .euiButtonEmpty,
    ${scope} .kbnFilterButtonGroup.kbnFilterButtonGroup--attached > *:last-of-type [class*='-euiButtonDisplay'] {
      border-start-end-radius: 0 !important;
      border-end-end-radius: 0 !important;
    }

    /* Date range time window buttons — same visual language, separate EuiButtonGroup DOM. */
    ${scope} [data-test-subj='dateRangePickerTimeWindowButtons'] {
      border-radius: ${knobVar('radiusControl')} !important;
      overflow: hidden;
      background-color: ${knobVar('surface')} !important;
      position: relative;
      width: fit-content;
    }

    ${scope} [data-test-subj='dateRangePickerTimeWindowButtons']::after {
      content: '' !important;
      position: absolute;
      inset: 0;
      border: none !important;
      box-shadow: ${NIRBANA_HAIRLINE_INSET_SHADOW} !important;
      border-radius: inherit;
      pointer-events: none;
    }

    ${scope} [data-test-subj='dateRangePickerTimeWindowButtons'] .euiButtonGroup__buttons {
      border-radius: inherit !important;
      align-items: stretch;
    }

    ${scope} [data-test-subj='dateRangePickerTimeWindowButtons'] .euiButtonGroup__buttons > *:not(:last-child) {
      border-right: ${NIRBANA_HAIRLINE} !important;
    }

    ${scope} [data-test-subj='dateRangePickerTimeWindowButtons'] .euiButtonGroupButton::before {
      display: none !important;
    }

    ${scope} [data-test-subj='dateRangePickerTimeWindowButtons'] .euiButtonGroupButton {
      border: none !important;
      margin-inline-start: 0 !important;
      background-color: ${knobVar('surface')} !important;
    }

    ${scope} [data-test-subj='dateRangePickerTimeWindowButtons'] .euiButtonGroup__tooltipWrapper {
      display: flex;
      flex: 0 0 auto !important;
      flex-direction: column;
      align-items: stretch;
      height: 100%;
      width: auto;
      aspect-ratio: 1;
      align-self: stretch;
      min-width: 0;
      overflow: hidden;
    }

    ${scope} [data-test-subj='dateRangePickerTimeWindowButtons'] .euiButtonGroupButton,
    ${scope} [data-test-subj='dateRangePickerTimeWindowButtons'] [class*='-euiButtonDisplay'] {
      flex: 1 1 auto;
      width: 100%;
      min-width: 0 !important;
      height: auto !important;
      min-height: 100%;
      border-radius: 0 !important;
    }

    ${scope} [data-test-subj='dateRangePickerTimeWindowButtons'] .euiButtonGroup__buttons > *:first-child .euiButtonGroupButton,
    ${scope} [data-test-subj='dateRangePickerTimeWindowButtons'] .euiButtonGroup__buttons > *:first-child [class*='-euiButtonDisplay'] {
      border-start-start-radius: ${knobVar('radiusControl')} !important;
      border-end-start-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope} [data-test-subj='dateRangePickerTimeWindowButtons'] .euiButtonGroup__buttons > *:last-child .euiButtonGroupButton,
    ${scope} [data-test-subj='dateRangePickerTimeWindowButtons'] .euiButtonGroup__buttons > *:last-child [class*='-euiButtonDisplay'] {
      border-start-end-radius: ${knobVar('radiusControl')} !important;
      border-end-end-radius: ${knobVar('radiusControl')} !important;
    }

    /* Discover data table toolbar — control groups + standalone grid controls. */

    ${scope} [data-test-subj='unifiedDataTableToolbar'] {
      padding-block-end: 12px !important;
    }

    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlGroup {
      border-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlGroup::after {
      content: '' !important;
      position: absolute;
      inset: 0;
      border: none !important;
      box-shadow: ${NIRBANA_HAIRLINE_INSET_SHADOW} !important;
      border-radius: inherit;
      pointer-events: none;
    }

    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlGroup .unifiedDataTableToolbarControlIconButton > div {
      z-index: auto !important;
    }

    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlGroup:has([data-test-subj='inTableSearchInput']) {
      overflow: visible !important;
    }

    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlIconButton + .unifiedDataTableToolbarControlIconButton,
    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlButton + .unifiedDataTableToolbarControlButton {
      border-inline-start: none !important;
    }

    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlGroup .unifiedDataTableToolbarControlIconButton:not(:has([data-test-subj='inTableSearchInput'])) {
      display: flex;
      flex: 0 0 auto !important;
      flex-direction: column;
      align-items: stretch;
      overflow: hidden;
    }

    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlGroup .unifiedDataTableToolbarControlIconButton:not(:has([data-test-subj='inTableSearchInput'])) > div {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      align-items: stretch;
      width: 100%;
      height: 100%;
      min-height: 0;
      min-width: 0;
    }

    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlGroup .unifiedDataTableToolbarControlIconButton:has([data-test-subj='inTableSearchInput']) {
      aspect-ratio: unset !important;
      flex: 1 1 auto !important;
      width: auto !important;
      overflow: visible !important;
    }

    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlGroup .euiToolTipAnchor,
    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlGroup .euiPopover {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      align-items: stretch;
      width: 100%;
      height: 100%;
      min-height: 0;
      min-width: 0;
    }

    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlGroup .euiButtonIcon,
    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlGroup .euiDataGridToolbarControl,
    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlGroup [class*='-euiButtonDisplay'] {
      flex: 1 1 auto;
      width: 100%;
      min-width: 0 !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      background-color: ${knobVar('surface')} !important;
    }

    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlGroup .unifiedDataTableToolbarControlIconButton:not(:has([data-test-subj='inTableSearchInput'])) .euiDataGridToolbarControl,
    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlGroup .unifiedDataTableToolbarControlIconButton:not(:has([data-test-subj='inTableSearchInput'])) .euiButtonIcon {
      block-size: 32px !important;
      inline-size: 32px !important;
      min-block-size: 32px !important;
      min-inline-size: 32px !important;
      height: 32px !important;
      width: 32px !important;
    }

    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlGroup > *:first-child .euiButtonIcon,
    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlGroup > *:first-child .euiDataGridToolbarControl,
    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlGroup > *:first-child [class*='-euiButtonDisplay'] {
      border-start-start-radius: ${knobVar('radiusControl')} !important;
      border-end-start-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlGroup > *:last-child .euiButtonIcon,
    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlGroup > *:last-child .euiDataGridToolbarControl,
    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlGroup > *:last-child [class*='-euiButtonDisplay'] {
      border-start-end-radius: ${knobVar('radiusControl')} !important;
      border-end-end-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlButton .euiDataGridToolbarControl {
      border: none !important;
      border-radius: ${knobVar('radiusControl')} !important;
      box-shadow: ${NIRBANA_HAIRLINE_INSET_SHADOW} !important;
      background-color: ${knobVar('surface')} !important;
    }

    ${scope} [data-test-subj='unifiedDataTableToolbar'] .unifiedDataTableToolbarControlGroup .unifiedDataTableToolbarControlButton .euiDataGridToolbarControl {
      border-radius: 0 !important;
      box-shadow: none !important;
    }

    ${scope} [data-test-subj='controls-group-wrapper'] {
      padding: ${knobVar('padding')} !important;
      padding-block-start: 0 !important;
      padding-block-end: 16px !important;
    }

    ${scope}:has(.dshDashboardViewportWrapper--isFullscreen) [data-test-subj='controls-group-wrapper'] {
      padding-top: ${DESIGN_EXPLORATION_PADDING}px !important;
    }

    ${scope} [class*='css-'][class*='-euiTab__content-m'] {
      font-weight: 500 !important;
    }

    ${scope} .euiTab:not(.euiTab-isSelected):not([aria-selected='true']) {
      color: ${colors.textSubdued} !important;
    }

    ${scope} .euiTab.euiTab-isSelected,
    ${scope} .euiTab[aria-selected='true'] {
      color: ${colors.textParagraph} !important;
    }

    ${scope} .euiTab.euiTab-isSelected::after,
    ${scope} .euiTab[aria-selected='true']::after {
      border-color: ${colors.primary} !important;
    }

    /* ----- App header ----- */
    /* Flat, static, no glass/blur — same philosophy as Linbana. */
    ${scope} [class*='css-'][class*='-app_header_shell--primaryRow'] {
      padding-block-start: ${knobVar('padding')} !important;
    }

    /* Discover: session tabs arrive via titleAppend (same primary row as the
       title). Stack title + tabs so the menu stays on the title row — POC
       stand-in for a real AppHeader tabsContent slot. */
    ${scope} [data-test-subj='appHeader']:has([data-test-subj='unifiedTabs_tabsBar'])
      [class*='css-'][class*='-app_header_shell--primaryRow'] {
      align-items: flex-start !important;
    }

    ${scope} [data-test-subj='appHeader']:has([data-test-subj='unifiedTabs_tabsBar'])
      [class*='css-'][class*='-app_header_shell--titleCluster'] {
      flex-direction: column !important;
      align-items: stretch !important;
    }

    ${scope} [data-test-subj='appHeader']:has([data-test-subj='unifiedTabs_tabsBar'])
      [class*='css-'][class*='-app_header_shell--titleGroup'],
    ${scope} [data-test-subj='appHeader']:has([data-test-subj='unifiedTabs_tabsBar'])
      [class*='css-'][class*='-app_header_shell--titleAppend'] {
      max-width: none !important;
      width: 100% !important;
      flex: 0 0 auto !important;
    }

    ${scope} [data-test-subj='appHeader']:has([data-test-subj='unifiedTabs_tabsBar'])
      [class*='css-'][class*='-app_header_shell--titleAppend'] {
      justify-content: flex-start !important;
      margin-block-start: 16px !important;
    }

    ${scope} [data-test-subj='appHeader']:has([data-test-subj='unifiedTabs_tabsBar']) {
      padding-inline: 24px !important;
      border-block-end: none !important;
    }

    ${scope} [data-test-subj='dataView-add-field_btn'] {
      border-radius: 12px !important;
    }

    ${scope} [class*='css-'][class*='-tab_with_background--TabWithBackground'] {
      margin-inline: 0 !important;
    }

    ${scope} [class*='css-'][class*='-tab--getTabContentCss'] {
      height: 32px !important;
    }

    ${scope} [class*='css-'][class*='-tab--getTabContainerCss'] .unifiedTabs__tabActions {
      top: 4px !important;
    }

    ${scope} [data-test-subj='appHeader'] {
      border-block-end: ${NIRBANA_HAIRLINE} !important;
      background-color: ${knobVar('surface')} !important;
    }

    ${scope}${DASHBOARDS_APP_HAS_SELECTOR} [data-test-subj='appHeader'] {
      padding-inline: ${knobVar('padding')} !important;
      margin-inline: 0 !important;
      margin-top: 0 !important;
      border-radius: 0 !important;
      border-top: none !important;
      border-inline: none !important;
      box-shadow: none !important;
      background-color: ${knobVar('surface')} !important;
    }

    /* Title width is driven by a hidden sizer span in the same grid cell as
       appHeaderTitle — typography must live on a shared ancestor, not the
       visible span alone, or the grid cell over-sizes and leaves a gap before
       title actions (share). */
    ${scope} [data-test-subj='appHeader'] .euiTitle h1 {
      font-size: 14px !important;
      font-weight: 600 !important;
    }

    ${scope} .echMetricText__title > span {
      font-size: 14px !important;
      font-weight: 600 !important;
      color: ${bespokeVar('textNav')} !important;
    }

    ${scope} .echMetricText {
      padding: 0 !important;
      color: ${bespokeVar('textNav')} !important;
    }

    ${scope} .echMetricText__value,
    ${scope} .echMetricText__value .echMetricText__part {
      color: ${bespokeVar('textNav')} !important;
    }

    ${scope} .echMetricText__title > span,
    ${scope} .echMetricText__subtitle {
      padding-left: 4px !important;
    }

    ${scope} .echMetricText__subtitle {
      color: ${bespokeVar('textSubdued')} !important;
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

    ${scope} [data-test-subj='appHeader'] [class*='css-'][class*='-euiButtonDisplay-euiButtonEmpty'][class*='app_menu_item--buttonCss'] {
      border-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope} [data-test-subj='appHeader'] [class*='css-'][class*='-euiButtonIcon']:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary) {
      border-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope} [data-test-subj='appHeader'] .euiSplitButtonActionPrimary {
      border-start-start-radius: ${knobVar('radiusButton')} !important;
      border-end-start-radius: ${knobVar('radiusButton')} !important;
      border-start-end-radius: 0 !important;
      border-end-end-radius: 0 !important;
      padding-inline-end: 12px !important;
    }

    ${scope} [data-test-subj='appHeader'] .euiSplitButtonActionSecondary {
      border-start-end-radius: ${knobVar('radiusButton')} !important;
      border-end-end-radius: ${knobVar('radiusButton')} !important;
      border-start-start-radius: 0 !important;
      border-end-start-radius: 0 !important;
    }

    ${scope} .kbnChromeLayoutApplication:has([data-test-subj='appHeader']) {
      --kbn-application--top-bar-height: ${NIRBANA_TOP_BAR_HEIGHT}px !important;
      border-radius: ${knobVar('radiusContainer')} !important;
      // border: ${NIRBANA_HAIRLINE} !important;
    }

    /* Opaque topBar shell — never faded — so scroll content cannot bleed through on reveal.
       Hairline lives on the shell, not appHeader: fixed height + overflow:hidden clips the
       header's bottom border on dashboard detail view. */
    ${scope}:has(${DASHBOARD_CONTAINER_SELECTOR}) .kbnChromeLayoutApplication > div:has([data-test-subj='appHeader']) {
      height: ${NIRBANA_TOP_BAR_HEIGHT}px !important;
      min-height: 0 !important;
      opacity: 1 !important;
      overflow: hidden !important;
      background-color: ${knobVar('surface')} !important;
      border-block-end: ${NIRBANA_HAIRLINE} !important;
      transition: height ${NIRBANA_APP_HEADER_TRANSITION_MS}ms ease !important;
    }

    ${scope}:has(${DASHBOARD_CONTAINER_SELECTOR})
      .kbnChromeLayoutApplication > div:has([data-test-subj='appHeader'])
      [data-test-subj='appHeader'] {
      border-block-end: none !important;
      margin-bottom: 0 !important;
    }

    ${scope}${DASHBOARDS_APP_HAS_SELECTOR} [data-test-subj='appHeader'] {
      opacity: 1 !important;
      position: relative !important;
      top: auto !important;
    }

    ${scope}${DASHBOARDS_APP_HAS_SELECTOR} [data-test-subj='appHeader'] > div {
      opacity: 1;
      transition: opacity ${NIRBANA_APP_HEADER_TRANSITION_MS}ms ease
        ${NIRBANA_APP_HEADER_TRANSITION_MS}ms !important;
    }

    ${scope} .kbnChromeLayoutApplication div:has(> [data-test-subj='appHeader']) {
      width: 100% !important;
      margin: 0 !important;
      min-height: 48px !important;
    }

    ${scope} .kbnChromeLayoutApplication {
      background-color: ${knobVar('surface')} !important;
      border-radius: ${knobVar('radiusContainer')} !important;
      box-shadow: ${knobVar('shellShadow')} !important;
      outline: none !important;
      margin-right: 8px !important;
    }

    /* No border-block-end at rest — Intercom relies on spacing; show hairline on scroll. */
    ${scope} .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      top: ${NIRBANA_TOP_BAR_HEIGHT}px !important;
      width: 100% !important;
      border-block-end: ${NIRBANA_HAIRLINE} !important;
      box-shadow: none !important;
      background-color: ${knobVar('surface')} !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      margin-inline: 0 !important;
      transition: top ${NIRBANA_APP_HEADER_TRANSITION_MS}ms ease !important;
    }

    /* Fullscreen hides chrome — no app header to offset against; pin top nav immediately. */
    ${scope}:has(.dshDashboardViewportWrapper--isFullscreen) .kbnChromeLayoutApplication {
      --kbn-application--sticky-headers-offset: 0px !important;
      --kbnAppHeadersOffset: 0px !important;
    }

    ${scope}:has(.dshDashboardViewportWrapper--isFullscreen)
      .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      top: 0 !important;
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
      transition: height ${NIRBANA_APP_HEADER_TRANSITION_MS}ms ease
        ${NIRBANA_APP_HEADER_TRANSITION_MS}ms !important;
    }

    ${scope}[${DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR}='true']:has(${DASHBOARD_CONTAINER_SELECTOR})
      [data-test-subj='appHeader'] > div {
      opacity: 0 !important;
      pointer-events: none !important;
      transition: opacity ${NIRBANA_APP_HEADER_TRANSITION_MS}ms ease !important;
    }

    ${scope}[${DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR}='true']:has(${DASHBOARD_CONTAINER_SELECTOR})
      .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      top: 0 !important;
      transition: top ${NIRBANA_APP_HEADER_TRANSITION_MS}ms ease
        ${NIRBANA_APP_HEADER_TRANSITION_MS}ms !important;
    }

    ${scope}[${DESIGN_EXPLORATION_SCROLLED_BODY_ATTR}='true']:has(${DASHBOARD_CONTAINER_SELECTOR})
      .kbnChromeLayoutApplication > div:has([data-test-subj='appHeader']) {
      border-block-end: none !important;
    }

    ${scope}[${DESIGN_EXPLORATION_SCROLLED_BODY_ATTR}='true']:has(${DASHBOARD_CONTAINER_SELECTOR})
      [data-test-subj='appHeader'] {
      border-block-end: none !important;
      border-bottom: none !important;
      margin-bottom: 0 !important;
    }

    ${scope}[${DESIGN_EXPLORATION_SCROLLED_BODY_ATTR}='true']
      .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      width: 100% !important;
      margin: 0 !important;
      border-radius: 0 !important;
    }

    ${scope} .dshDashboardViewportWrapper,
    ${scope} .dshDashboardViewportWrapper--defaultBg {
      background-color: ${isDarkMode ? NIRBANA_SURFACE_APP_DARK : NIRBANA_SURFACE_APP_LIGHT} !important;
    }
  `;
};
