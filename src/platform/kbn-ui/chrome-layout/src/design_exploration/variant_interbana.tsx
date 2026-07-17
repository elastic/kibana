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

export const INTERBANA_VARIANT_ID = 'interbana';

// Interbana (Intercom-influenced) shares Linbana/Linear's flat, shadow-free,
// hairline-over-blur base, but diverges in a few deliberate ways per the
// Intercom reference screenshots:
//   - much airier padding/gaps everywhere (toolbar rows, panel internals,
//     gutter between panels)
//   - large, soft radii — buttons read as full capsules/pills, panels use a
//     bigger radius than Linear's crisper 8-10px geometry
//   - far fewer *internal* dividers — separation between individual settings
//     rows/cards comes from generous gap + each card having its own border,
//     not from a shared hairline splitting one container into rows
//   - low size-contrast type scale — panel titles sit much closer in size to
//     body text than Linear's stronger heading/body contrast
//   - no nav-vs-content color step — Intercom's sidebar is the same white as
//     content; wayfinding relies on the active-item pill + spacing alone
//   - warm orange accent instead of Linear's cool indigo
const INTERBANA_RADIUS_CONTROL = 8; // inputs, nav selection pill
const INTERBANA_RADIUS_BUTTON = 999; // full capsule/pill buttons
const INTERBANA_RADIUS_CONTAINER = 16; // application chrome container
const INTERBANA_RADIUS_PANEL = 12; // cards, panels
const INTERBANA_RADIUS_PANEL_COMPACT = 12; // compact single-stat / metric panels
const INTERBANA_ACCENT = '#F26522'; // warm orange accent (est. from reference)
const INTERBANA_MENU_ITEM_TEXT_COLOR = '#333333';
const INTERBANA_SURFACE = 'lch(98.94 0.5 282)'; // content surface
const INTERBANA_SURFACE_NAV = 'lch(98.94 0.5 282)'; // no step off content — same as surface
const INTERBANA_PANEL_PADDING = DESIGN_EXPLORATION_PADDING_COMPACT + 12; // roomier than Linbana
const INTERBANA_PADDING = 24; // airier outer padding than Linbana's 20
const INTERBANA_GUTTER = 20; // more generous panel-to-panel gap than Linbana's 8
const INTERBANA_TOP_BAR_HEIGHT = 80;
const INTERBANA_APP_HEADER_TRANSITION_MS = 200;
const INTERBANA_NAV_EXPANDED_WIDTH = 220;
const INTERBANA_NAV_WIDE_WIDTH = 460;

const INTERBANA_NAV_EXPANDED_SELECTOR = `[data-test-subj='sideNavCollapseButton'][aria-pressed='true']`;

/** Chrome layout grid root — first column width comes from React, not CSS vars alone. */
const CHROME_LAYOUT_GRID_SELECTOR = `div:has(> [data-test-subj='kbnChromeLayoutNavigation']):has(> [data-test-subj='kbnChromeLayoutApplication'])`;

const interbanaApplicationWidthCalc = (navWidth: number) =>
  `calc(100vw - ${navWidth}px - var(${layoutVarName('application.right')}))`;

const interbanaNavLayoutOverrides = (navWidth: number) => {
  const applicationWidth = interbanaApplicationWidthCalc(navWidth);

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

const interbanaGridTemplateColumns = (navWidth: number) =>
  `${navWidth}px 1fr var(${layoutVarName('sidebar.width')}, 0px)`;

const INTERBANA_TW_RING_OFFSET_SHADOW = '0 0 #0000';
const INTERBANA_TW_RING_SHADOW = '0 0 #0000';
const INTERBANA_TW_SHADOW = '0px 1px 4px 0px rgba(20, 20, 20, 0.15)';
const INTERBANA_APPLICATION_BOX_SHADOW = `var(--tw-ring-offset-shadow, ${INTERBANA_TW_RING_OFFSET_SHADOW}), var(--tw-ring-shadow, ${INTERBANA_TW_RING_SHADOW}), var(--tw-shadow)`;

export const createInterbanaStyles = (euiTheme: UseEuiTheme) => {
  const scope = designExplorationVariantScope(INTERBANA_VARIANT_ID);
  const { colors } = euiTheme.euiTheme;

  // Still a single shared hairline for anywhere a border remains, but it's
  // used far more sparingly than in Linbana — mainly on individual cards and
  // controls, not as internal row dividers within a shared container.
  const INTERBANA_HAIRLINE = `1px solid color-mix(in srgb, ${colors.borderBaseSubdued} 70%, transparent)`;
  const INTERBANA_SURFACE_HOVER_FILL = `color-mix(in srgb, ${colors.textParagraph} 4%, transparent)`;

  return css`
    // ${scope} {
    //   ${layoutVarName('application.marginRight')}: 0px !important;
    // }

    /* ----- Base surfaces ----- */
    /* No color-step between nav and content — both read as the same near-
       white surface, per the Intercom reference (unlike Linbana's cooler nav
       step). Separation comes from spacing and the active-item pill alone. */
    ${scope} [class*='css-'][class*='-euiPageSection-grow-l-top-plain'],
    ${scope} [class*='css-'][class*='-euiPageInner-panelled'] {
      background-color: ${INTERBANA_SURFACE} !important;
      box-shadow: none !important;
      border: none !important;
    }

    ${scope} [class*='css-'][class*='-euiPageSection__content'][class*='-restrictWidth'] {
      max-width: none !important;
    }

    ${scope} [class*='css-'][class*='-euiTable'][class*='-hasBackground-desktop'] {
      background-color: transparent !important;
    }

    ${scope} .kbnChromeLayoutNavigation {
      background-color: transparent !important;
      border-inline-end: none !important;
    }

    /* ----- Interbana expanded nav — layout width + grid column sync ----- */
    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR}) {
      ${interbanaNavLayoutOverrides(INTERBANA_NAV_EXPANDED_WIDTH)}
    }

    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR}) ${CHROME_LAYOUT_GRID_SELECTOR} {
      grid-template-columns: ${interbanaGridTemplateColumns(
        INTERBANA_NAV_EXPANDED_WIDTH
      )} !important;
    }

    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR}):has(.kbnChromeNav-sidePanel) {
      ${interbanaNavLayoutOverrides(INTERBANA_NAV_WIDE_WIDTH)}
    }

    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR}):has(.kbnChromeNav-sidePanel)
      ${CHROME_LAYOUT_GRID_SELECTOR} {
      grid-template-columns: ${interbanaGridTemplateColumns(INTERBANA_NAV_WIDE_WIDTH)} !important;
    }

    /* ----- Interbana expanded nav — primary rail ----- */
    ${scope}
    .kbnChromeNav-root:has(${INTERBANA_NAV_EXPANDED_SELECTOR})[class*='getNavWrapperStyles'] {
      width: ${INTERBANA_NAV_EXPANDED_WIDTH}px !important;
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
      border-radius: ${INTERBANA_RADIUS_CONTROL}px !important;
      min-height: 32px !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-primaryNavigation']
    [data-menu-item='true'] {
      --menu-item-text-color: ${INTERBANA_MENU_ITEM_TEXT_COLOR} !important;
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
      outline: 2px solid ${INTERBANA_ACCENT} !important;
      outline-offset: -2px !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-primaryNavigation']
    [data-menu-item='true']:focus-visible
    .kbnChromeNav-iconWrapper {
      border: none !important;
    }

    /* ----- Interbana expanded nav — footer labels ----- */
    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR}) [data-test-subj='kbnChromeNav-footer'] {
      align-items: stretch !important;
      gap: 2px !important;
      padding-inline: ${DESIGN_EXPLORATION_GAP}px !important;
    }

    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      > div:not(.sideNavCollapseButtonWrapper),
    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .euiPopover,
    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .euiToolTipAnchor {
      width: 100% !important;
      justify-content: flex-start !important;
    }

    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label] {
      --menu-item-text-color: ${INTERBANA_MENU_ITEM_TEXT_COLOR};
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: flex-start !important;
      gap: ${DESIGN_EXPLORATION_GAP}px !important;
      width: 100% !important;
      min-height: 32px !important;
      border-radius: ${INTERBANA_RADIUS_CONTROL}px !important;
    }

    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR})
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

    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR})
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

    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]
      .euiButtonIcon__icon,
    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]
      [data-euiicon-type],
    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .sideNavCollapseButtonWrapper[data-footer-label]
      .euiButtonIcon__icon,
    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .sideNavCollapseButtonWrapper[data-footer-label]
      [data-euiicon-type] {
      width: 16px !important;
      height: 16px !important;
    }

    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]:has([data-highlighted='true']) {
      background-color: color-mix(in srgb, ${colors.textParagraph} 8%, transparent) !important;
    }

    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]:has([data-highlighted='false']:hover) {
      background-color: color-mix(in srgb, ${colors.textParagraph} 5%, transparent) !important;
    }

    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]:has([data-test-subj^='kbnChromeNav-footerItem-']:focus-visible) {
      outline: 2px solid ${INTERBANA_ACCENT} !important;
      outline-offset: -2px !important;
    }

    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .sideNavCollapseButtonWrapper[data-footer-label]
      .euiToolTipAnchor {
      width: auto !important;
      flex-shrink: 0 !important;
      padding-inline: ${DESIGN_EXPLORATION_GAP}px !important;
    }

    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR})
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

    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .sideNavCollapseButtonWrapper[data-footer-label]:has([data-test-subj='sideNavCollapseButton']:hover) {
      background-color: color-mix(in srgb, ${colors.textParagraph} 5%, transparent) !important;
    }

    ${scope}:has(${INTERBANA_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .sideNavCollapseButtonWrapper[data-footer-label]:has([data-test-subj='sideNavCollapseButton']:focus-visible) {
      outline: 2px solid ${INTERBANA_ACCENT} !important;
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
      background-color: ${INTERBANA_SURFACE_NAV} !important;
      border-radius: ${INTERBANA_RADIUS_CONTAINER}px 0 0 ${INTERBANA_RADIUS_CONTAINER}px !important;
      box-shadow: none !important;
      outline: none !important;
      margin-top: 0 !important;
      margin-bottom: 8 !important;
    }

    ${scope} .kbnChromeNav-sidePanel
    [data-test-subj^='kbnChromeNav-sidePanelItem-'],
    ${scope} [data-test-subj*='kbnChromeNav-sidePanel']
      [data-test-subj^='kbnChromeNav-sidePanelItem-'] {
      border-radius: ${INTERBANA_RADIUS_CONTROL}px !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      padding-inline-start: ${INTERBANA_PADDING}px !important;
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

    ${scope} .kbnChromeLayoutHeader {
      background-color: transparent !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
    }

    ${scope} [class*='css-'][class*='-global_header_shell--logoSlot'] {
      --logo-width: 56px !important;
      width: 56px !important;
    }

    ${scope} [data-test-subj='chromeNextGlobalHeader'] > [class*='css-'][class*='-global_header_shell--leftGroup'] + [class*='css-'][class*='-global_header_shell--separator'] {
      display: none !important;
    }

    // ${scope} [data-test-subj='chromeNextGlobalHeader'] {
    //   border-bottom: ${INTERBANA_HAIRLINE} !important;
    // }

    ${scope} [class*='css-'][class*='-global_header_shell--rightGroup'] {
      gap: 4px !important;
    }

    ${scope} [data-test-subj='chromeNextGlobalHeaderActions'] {
      display: none !important;
    }

    /* ----- Dashboard grid & panels ----- */
    /* Wider gutter than Linbana — panels read as individually-bordered cards
       with generous air between them, rather than tightly packed regions of
       one continuous surface. */
    ${scope} [data-test-subj='kbnGridLayout'] {
      --kbnGridGutterSize: ${INTERBANA_GUTTER} !important;
      padding: ${INTERBANA_PADDING}px !important;
    }

    /* Larger, softer radius than Linbana; still flat/no-shadow. */
    ${scope} [data-test-subj='embeddablePanel'] {
      border-radius: ${INTERBANA_RADIUS_PANEL}px !important;
      border: ${INTERBANA_HAIRLINE} !important;
      box-shadow: none !important;
    }

    ${scope} [data-test-subj='embeddablePanel']:has(.echMetricText) {
      border-radius: ${INTERBANA_RADIUS_PANEL_COMPACT}px !important;
    }

    ${scope} .dshLayout--editing .embPanel__header:hover {
      background-color: ${INTERBANA_SURFACE_HOVER_FILL} !important;
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
    }

    /* Roomier internal padding than Linbana — content never sits flush
       against the panel border. */
    ${scope} [class*='css-'][class*='react_expression_renderer--ReactExpressionRenderer'],
    ${scope} [class*='css-'][class*='visualization_container--VisualizationContainer'] {
      padding: 0 ${INTERBANA_PANEL_PADDING}px ${INTERBANA_PANEL_PADDING}px !important;
    }

    ${scope} [class*='css-'][class*='react_expression_renderer--ReactExpressionRenderer']:has(.echMetricText),
    ${scope} [class*='css-'][class*='visualization_container--VisualizationContainer']:has(.echMetricText) {
      padding: ${DESIGN_EXPLORATION_GAP + 8}px ${DESIGN_EXPLORATION_GAP + 4}px
        ${DESIGN_EXPLORATION_GAP + 4}px !important;
    }

    /* ----- Form controls ----- */
    ${scope} .euiFormControlLayout:not(.euiFormControlLayout--group):not(:has(:invalid, [aria-invalid='true'])):not(:has(:disabled)) {
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      background-color: ${colors.backgroundBasePlain} !important;
    }

    ${scope} .euiFormControlLayout:not(.euiFormControlLayout--group):focus-within:not(:has(:invalid, [aria-invalid='true'])) {
      border: 1px solid ${INTERBANA_ACCENT} !important;
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
      border-radius: ${INTERBANA_RADIUS_CONTROL}px !important;
      box-shadow: none !important;
      background-color: ${colors.backgroundBasePlain} !important;
    }

    ${scope} .euiFormControlLayout--group:not(:focus-within) {
      overflow: visible !important;
      border: ${INTERBANA_HAIRLINE} !important;
      border-radius: ${INTERBANA_RADIUS_CONTROL}px !important;
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
      border-radius: ${INTERBANA_RADIUS_BUTTON}px !important;
    }

    ${scope} .euiSplitButtonActionPrimary {
      border-start-start-radius: ${INTERBANA_RADIUS_BUTTON}px !important;
      border-end-start-radius: ${INTERBANA_RADIUS_BUTTON}px !important;
      border-start-end-radius: 0 !important;
      border-end-end-radius: 0 !important;
      padding-left: 12px !important;
      padding-right: 0 !important;
    }

    ${scope} .euiSplitButtonActionSecondary {
      border-start-end-radius: ${INTERBANA_RADIUS_BUTTON}px !important;
      border-end-end-radius: ${INTERBANA_RADIUS_BUTTON}px !important;
      border-start-start-radius: 0 !important;
      border-end-start-radius: 0 !important;
      padding-right: 4px !important;
    }

    ${scope} [data-test-subj='globalQueryBar'] {
      padding: ${INTERBANA_PADDING}px !important;
      padding-block-start: 16px !important;
      padding-block-end: ${DESIGN_EXPLORATION_PADDING_COMPACT}px !important;
    }

    ${scope}
    .euiFormControlLayout:has([data-test-subj='queryInput'], [data-test-subj='dateRangePickerControlButton']):not(:focus-within):not(:has(:invalid, [aria-invalid='true'])) {
      border: ${INTERBANA_HAIRLINE} !important;
      border-radius: ${INTERBANA_RADIUS_CONTROL}px !important;
    }

    ${scope}
    .euiFormControlLayout:has([data-test-subj='queryInput'], [data-test-subj='dateRangePickerControlButton']):focus-within:not(:has(:invalid, [aria-invalid='true'])) {
      border: 1px solid ${INTERBANA_ACCENT} !important;
    }

    ${scope} [data-test-subj='controls-group-wrapper'] {
      padding: ${INTERBANA_PADDING}px !important;
      padding-block-start: 0 !important;
      padding-block-end: 16px !important;
    }

    ${scope}:has(.dshDashboardViewportWrapper--isFullscreen) [data-test-subj='controls-group-wrapper'] {
      padding-top: ${DESIGN_EXPLORATION_PADDING}px !important;
    }

    ${scope} [class*='css-'][class*='-euiTab__content-m'] {
      font-weight: 500 !important;
    }

    /* ----- App header ----- */
    /* Flat, static, no glass/blur — same philosophy as Linbana. */
    ${scope} [data-test-subj='appHeader'] {
      border-block-end: ${INTERBANA_HAIRLINE} !important;
    }

    ${scope}${DASHBOARDS_APP_HAS_SELECTOR} [data-test-subj='appHeader'] {
      padding-inline: ${INTERBANA_PADDING}px !important;
      padding-block: 16px !important;
      margin-inline: 0 !important;
      margin-top: 0 !important;
      border-radius: 0 !important;
      border-top: none !important;
      border-inline: none !important;
      box-shadow: none !important;
      background-color: ${INTERBANA_SURFACE} !important;
    }

    ${scope}${DASHBOARDS_APP_HAS_SELECTOR} [data-test-subj='appHeader']:has([data-test-subj='appHeaderTabs']) {
      padding-block-end: 0 !important;
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
      border-radius: ${INTERBANA_RADIUS_BUTTON}px !important;
    }

    ${scope} [data-test-subj='appHeader'] [data-test-subj^='app-menu-action-button-']:hover
      [class*='app_menu_action_button--buttonCss'],
    ${scope} [data-test-subj='appHeader'] [data-test-subj^='app-menu-action-button-']:focus
      [class*='app_menu_action_button--buttonCss'] {
      background-color: transparent !important;
      border-radius: ${INTERBANA_RADIUS_BUTTON}px !important;
    }

    ${scope} [data-test-subj='appHeader'] [class*='css-'][class*='-euiButtonDisplay-euiButtonEmpty'][class*='app_menu_item--buttonCss'] {
      border-radius: ${INTERBANA_RADIUS_CONTROL}px !important;
    }

    ${scope} [data-test-subj='appHeader'] [class*='css-'][class*='-euiButtonIcon']:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary) {
      border-radius: ${INTERBANA_RADIUS_CONTROL}px !important;
    }

    ${scope} [data-test-subj='appHeader'] .euiSplitButtonActionPrimary {
      border-start-start-radius: ${INTERBANA_RADIUS_BUTTON}px !important;
      border-end-start-radius: ${INTERBANA_RADIUS_BUTTON}px !important;
      border-start-end-radius: 0 !important;
      border-end-end-radius: 0 !important;
    }

    ${scope} [data-test-subj='appHeader'] .euiSplitButtonActionSecondary {
      border-start-end-radius: ${INTERBANA_RADIUS_BUTTON}px !important;
      border-end-end-radius: ${INTERBANA_RADIUS_BUTTON}px !important;
      border-start-start-radius: 0 !important;
      border-end-start-radius: 0 !important;
    }

    ${scope} .kbnChromeLayoutApplication:has([data-test-subj='appHeader']) {
      --kbn-application--top-bar-height: ${INTERBANA_TOP_BAR_HEIGHT}px !important;
      border-radius: ${INTERBANA_RADIUS_CONTAINER}px !important;
      // border: ${INTERBANA_HAIRLINE} !important;
    }

    /* Opaque topBar shell — never faded — so scroll content cannot bleed through on reveal.
       Hairline lives on the shell, not appHeader: fixed height + overflow:hidden clips the
       header's bottom border on dashboard detail view. */
    ${scope}:has(${DASHBOARD_CONTAINER_SELECTOR}) .kbnChromeLayoutApplication > div:has([data-test-subj='appHeader']) {
      height: ${INTERBANA_TOP_BAR_HEIGHT}px !important;
      min-height: 0 !important;
      opacity: 1 !important;
      overflow: hidden !important;
      background-color: ${INTERBANA_SURFACE} !important;
      border-block-end: ${INTERBANA_HAIRLINE} !important;
      transition: height ${INTERBANA_APP_HEADER_TRANSITION_MS}ms ease !important;
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
      transition: opacity ${INTERBANA_APP_HEADER_TRANSITION_MS}ms ease
        ${INTERBANA_APP_HEADER_TRANSITION_MS}ms !important;
    }

    ${scope} .kbnChromeLayoutApplication div:has(> [data-test-subj='appHeader']) {
      width: 100% !important;
      margin: 0 !important;
      min-height: 48px !important;
    }

    ${scope} .kbnChromeLayoutApplication {
      --tw-ring-offset-shadow: ${INTERBANA_TW_RING_OFFSET_SHADOW};
      --tw-ring-shadow: ${INTERBANA_TW_RING_SHADOW};
      --tw-shadow: ${INTERBANA_TW_SHADOW};
      background-color: ${INTERBANA_SURFACE} !important;
      box-shadow: ${INTERBANA_APPLICATION_BOX_SHADOW} !important;
      outline: none !important;
      margin-right: 8px !important;
    }

    /* No border-block-end at rest — Intercom relies on spacing; show hairline on scroll. */
    ${scope} .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      top: ${INTERBANA_TOP_BAR_HEIGHT}px !important;
      width: 100% !important;
      background-color: transparent !important;
      backdrop-filter: none !important;
      margin-inline: 0 !important;
      -webkit-backdrop-filter: none !important;
      border: none !important;
      box-shadow: none !important;
      transition: top ${INTERBANA_APP_HEADER_TRANSITION_MS}ms ease !important;
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
      transition: height ${INTERBANA_APP_HEADER_TRANSITION_MS}ms ease
        ${INTERBANA_APP_HEADER_TRANSITION_MS}ms !important;
    }

    ${scope}[${DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR}='true']:has(${DASHBOARD_CONTAINER_SELECTOR})
      [data-test-subj='appHeader'] > div {
      opacity: 0 !important;
      pointer-events: none !important;
      transition: opacity ${INTERBANA_APP_HEADER_TRANSITION_MS}ms ease !important;
    }

    ${scope}[${DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR}='true']:has(${DASHBOARD_CONTAINER_SELECTOR})
      .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      top: 0 !important;
      transition: top ${INTERBANA_APP_HEADER_TRANSITION_MS}ms ease
        ${INTERBANA_APP_HEADER_TRANSITION_MS}ms !important;
    }

    ${scope}[${DESIGN_EXPLORATION_SCROLLED_BODY_ATTR}='true']
      .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      width: 100% !important;
      margin: 0 !important;
      border-radius: 0 !important;
      border-block-end: ${INTERBANA_HAIRLINE} !important;
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
