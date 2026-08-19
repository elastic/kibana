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

export const TARGET_VARIANT_ID = 'target';

// Target starts as a fork of Nirbana (the proposed visual-refresh direction). Shares
// Nirbana's airy spacing, soft radii, quieter hairlines, and surface layering:
//   - much airier padding/gaps everywhere (toolbar rows, panel internals,
//     gutter between panels)
//   - large, soft radii on panels/containers; buttons share a consistent 8px radius
//     (no pill CTAs) vs Linear's mixed button geometry
//   - far fewer *internal* dividers — separation between individual settings
//     rows/cards comes from generous gap + each card having its own border,
//     not from a shared hairline splitting one container into rows
//   - low size-contrast type scale — panel titles sit much closer in size to
//     body text than Linear's stronger heading/body contrast
//   - canvas vs content contrast — blue-gray canvas (~Intercom #EFF0EB luminance)
//     lifts a true-white app surface; secondary nav side panel gets a subtle shade
//   - warm orange accent instead of Linear's cool indigo
const TARGET_ACCENT = '#F26522'; // warm orange accent (est. from reference)
const TARGET_SURFACE_APP_LIGHT = '#f5f7fb';
/** Dark html root — two steps below canvas `#09121E`. */
const TARGET_HTML_ROOT_DARK = '#040A14';
const TARGET_TOP_BAR_HEIGHT = 80;
const TARGET_APP_HEADER_TRANSITION_MS = 200;
/** Keep in sync with `mapDesignExplorationNavWidth` in design_exploration_project_side_nav. */
export const TARGET_NAV_EXPANDED_WIDTH = 220;
export const TARGET_NAV_COLLAPSED_WIDTH = 56;
export const TARGET_SIDE_PANEL_WIDTH = 248;
const TARGET_NAV_WIDE_WIDTH = TARGET_NAV_EXPANDED_WIDTH + TARGET_SIDE_PANEL_WIDTH;
const TARGET_NAV_COLLAPSED_WIDE_WIDTH = TARGET_NAV_COLLAPSED_WIDTH + TARGET_SIDE_PANEL_WIDTH;

const TARGET_NAV_EXPANDED_SELECTOR = `[data-test-subj='sideNavCollapseButton'][aria-pressed='true']`;

/** Chrome layout grid root — first column width comes from React, not CSS vars alone. */
const CHROME_LAYOUT_GRID_SELECTOR = `div:has(> [data-test-subj='kbnChromeLayoutNavigation']):has(> [data-test-subj='kbnChromeLayoutApplication'])`;

const targetApplicationWidthCalc = (navWidth: number) =>
  `calc(100vw - ${navWidth}px - var(${layoutVarName('application.right')}))`;

const targetNavLayoutOverrides = (navWidth: number) => {
  const applicationWidth = targetApplicationWidthCalc(navWidth);

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

const targetGridTemplateColumns = (navWidth: number) =>
  `${navWidth}px 1fr var(${layoutVarName('sidebar.width')}, 0px)`;

export const createTargetStyles = (euiTheme: UseEuiTheme) => {
  const scope = designExplorationVariantScope(TARGET_VARIANT_ID);
  const { colors, levels } = euiTheme.euiTheme;
  const isDarkMode = euiTheme.colorMode === 'DARK';

  // Dark mode keeps the exploration canvas and Borealis for chrome/cards.
  // Workspace (dashboard field) mixes toward canvas so cards lift — same
  // relationship as light: header + panels on a slightly darker field.
  const targetSurface = isDarkMode
    ? `color-mix(in srgb, ${knobVar('canvas')} 8%, ${colors.backgroundBasePlain})`
    : knobVar('surface');
  const targetSurfaceNav = isDarkMode ? colors.backgroundBaseSubdued : knobVar('surfaceNav');
  const targetAppSurface = isDarkMode
    ? `color-mix(in srgb, ${knobVar('canvas')} 65%, ${colors.backgroundBasePlain})`
    : TARGET_SURFACE_APP_LIGHT;
  const targetShellShadow = isDarkMode ? 'none' : knobVar('shellShadow');
  const targetText = isDarkMode
    ? `color-mix(in srgb, ${colors.textParagraph} 80%, transparent)`
    : `color-mix(in srgb, black 73%, transparent)`;
  const targetLink = isDarkMode
    ? `color-mix(in srgb, ${colors.textParagraph} 94%, transparent)`
    : `color-mix(in srgb, black 82%, transparent)`;
  const targetHeading = isDarkMode
    ? `color-mix(in srgb, white 8%, ${colors.textHeading})`
    : `color-mix(in srgb, black 85%, transparent)`;
  const targetTextNav = isDarkMode ? targetText : bespokeVar('textNav');
  const targetTextSubdued = isDarkMode ? colors.textSubdued : bespokeVar('textSubdued');
  const targetHairlineColor = isDarkMode
    ? `color-mix(in srgb, black 22%, ${colors.borderBaseSubdued})`
    : bespokeVar('borderSubdued');

  // Still a single shared hairline for anywhere a border remains, but it's
  // used far more sparingly than in Linbana — mainly on individual cards and
  // controls, not as internal row dividers within a shared container.
  // Steel blue overlay so hover/active reads cool, not charcoal gray.
  const TARGET_INTERACTIVE_BLUE = '#7E96B4';
  const targetHoverFill = isDarkMode
    ? `color-mix(in srgb, ${TARGET_INTERACTIVE_BLUE} 10%, transparent)`
    : `color-mix(in srgb, ${TARGET_INTERACTIVE_BLUE} 8%, transparent)`;
  const targetActiveFill = isDarkMode
    ? `color-mix(in srgb, ${TARGET_INTERACTIVE_BLUE} 16%, transparent)`
    : `color-mix(in srgb, ${TARGET_INTERACTIVE_BLUE} 12%, transparent)`;
  const TARGET_HAIRLINE = `1px solid ${targetHairlineColor}`;
  const TARGET_HAIRLINE_INSET_SHADOW = `0 0 0 1px ${targetHairlineColor} inset`;
  const TARGET_ACCENT_INSET_SHADOW = `0 0 0 1px ${TARGET_ACCENT} inset`;
  const TARGET_SURFACE_HOVER_FILL = targetHoverFill;

  return css`
    html:has(${scope}) {
      background-color: ${isDarkMode ? TARGET_HTML_ROOT_DARK : knobVar('canvas')} !important;
    }

    ${scope} {
      background-color: ${knobVar('canvas')} !important;
    }

    ${scope} .euiText:not([class*='subdued']):not([class*='success']):not([class*='danger']):not([class*='warning']):not([class*='primary']),
    ${scope} .euiTableCellContent,
    ${scope} .euiFormControlButton,
    ${scope} .euiFormControlLayout input,
    ${scope} .euiFormControlLayout select,
    ${scope} .euiFormControlLayout textarea,
    ${scope} .euiFormControlLayout .euiSuperSelectControl,
    ${scope} .euiFieldText,
    ${scope} .euiFieldSearch,
    ${scope} .euiSelect,
    ${scope} .euiFormLabel {
      color: ${targetText} !important;
    }

    ${scope} .euiTitle,
    ${scope} .euiTitle *:not([class*='Badge']):not([class*='euiButton']),
    ${scope} h1,
    ${scope} h2,
    ${scope} h3 {
      color: ${targetHeading} !important;
    }

    /* ----- Base surfaces ----- */
    /* Canvas (body) is blue-gray; app is white; side panel is a subtle step between them. */
    ${scope} [class*='css-'][class*='-euiPageSection-grow-l-top-plain'],
    ${scope} [class*='css-'][class*='-euiPageInner-'][class*='-panelled'] {
      background-color: ${targetSurface} !important;
      box-shadow: none !important;
      border: none !important;
    }

    ${scope} [class*='css-'][class*='-euiPageSection__content'][class*='-restrictWidth'] {
      max-width: none !important;
    }

    ${scope} [data-test-subj='search-homepage'] [class*='css-'][class*='-euiPageSection__content'][class*='-restrictWidth'] > .euiFlexGroup:first-of-type {
      padding-block-end: ${DESIGN_EXPLORATION_PADDING_COMPACT}px !important;
    }

    ${scope} .euiPageSidebar,
    ${scope} [class*='css-'][class*='-euiPageSidebar'] {
      border-inline-end: ${TARGET_HAIRLINE} !important;
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
      color: ${targetLink} !important;
      font-weight: 500 !important;
    }

    ${scope} .euiLink:not(:disabled):not([class*='success']):not([class*='danger']):not([class*='warning']):not([class*='subdued']) {
      color: ${targetLink} !important;
      text-decoration: underline dotted !important;
      text-decoration-thickness: 1px !important;
      text-underline-offset: 0.15em !important;
    }

    ${scope} .euiLink:not(:disabled):not([class*='success']):not([class*='danger']):not([class*='warning']):not([class*='subdued']):hover,
    ${scope} .euiLink:not(:disabled):not([class*='success']):not([class*='danger']):not([class*='warning']):not([class*='subdued']):focus,
    ${scope} .euiLink:not(:disabled):not([class*='success']):not([class*='danger']):not([class*='warning']):not([class*='subdued']):focus-visible,
    ${scope} .euiTableCellContent .euiLink:not(:disabled):hover,
    ${scope} .euiTableCellContent .euiLink:not(:disabled):focus,
    ${scope} .euiTableCellContent .euiLink:not(:disabled):focus-visible {
      color: ${colors.textPrimary} !important;
      text-decoration: underline solid !important;
      text-decoration-thickness: 1px !important;
      text-underline-offset: 0.15em !important;
    }

    ${scope} .euiTableCellContent .euiText:has([data-test-subj^='dashboardListingTitleLink-']) + .euiText {
      font-size: 12px !important;
    }

    ${scope} .euiTableCellContent .euiButtonIcon[class*='-empty-primary'],
    ${scope} .euiTableCellContent [class*='css-'][class*='-euiButtonIcon-'][class*='-empty-primary'] {
      color: ${targetText} !important;
    }

    ${scope} .kbnChromeLayoutNavigation {
      background-color: transparent !important;
      border-inline-end: none !important;
    }

    /* ----- Target collapsed nav — layout width + grid column sync ----- */
    ${scope}:not(:has(${TARGET_NAV_EXPANDED_SELECTOR})) {
      ${targetNavLayoutOverrides(TARGET_NAV_COLLAPSED_WIDTH)}
    }

    ${scope}:not(:has(${TARGET_NAV_EXPANDED_SELECTOR})) ${CHROME_LAYOUT_GRID_SELECTOR} {
      grid-template-columns: ${targetGridTemplateColumns(
        TARGET_NAV_COLLAPSED_WIDTH
      )} !important;
    }

    ${scope}:not(:has(${TARGET_NAV_EXPANDED_SELECTOR})):has(.kbnChromeNav-sidePanel) {
      ${targetNavLayoutOverrides(TARGET_NAV_COLLAPSED_WIDE_WIDTH)}
    }

    ${scope}:not(:has(${TARGET_NAV_EXPANDED_SELECTOR})):has(.kbnChromeNav-sidePanel)
      ${CHROME_LAYOUT_GRID_SELECTOR} {
      grid-template-columns: ${targetGridTemplateColumns(
        TARGET_NAV_COLLAPSED_WIDE_WIDTH
      )} !important;
    }

    ${scope} .kbnChromeNav-root:not(:has(${TARGET_NAV_EXPANDED_SELECTOR})) {
      width: ${TARGET_NAV_COLLAPSED_WIDTH}px !important;
      flex-shrink: 0 !important;
    }

    ${scope}:not(:has(${TARGET_NAV_EXPANDED_SELECTOR})) .kbnChromeNav-iconWrapper,
    ${scope}:not(:has(${TARGET_NAV_EXPANDED_SELECTOR})) .kbnChromeNav-iconWrapper::before {
      border-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope}:not(:has(${TARGET_NAV_EXPANDED_SELECTOR}))
      [data-menu-item='true'][data-highlighted='true'] {
      --menu-item-text-color: ${targetLink} !important;
      color: ${targetLink} !important;
    }

    ${scope}:not(:has(${TARGET_NAV_EXPANDED_SELECTOR}))
      [data-menu-item='true'][data-highlighted='true']
      .kbnChromeNav-iconWrapper {
      background-color: ${targetActiveFill} !important;
    }

    ${scope}:not(:has(${TARGET_NAV_EXPANDED_SELECTOR}))
      [data-menu-item='true'][data-highlighted='false']:hover
      .kbnChromeNav-iconWrapper {
      background-color: ${targetHoverFill} !important;
    }

    /* ----- Target expanded nav — layout width + grid column sync ----- */
    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR}) {
      ${targetNavLayoutOverrides(TARGET_NAV_EXPANDED_WIDTH)}
    }

    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR}) ${CHROME_LAYOUT_GRID_SELECTOR} {
      grid-template-columns: ${targetGridTemplateColumns(
        TARGET_NAV_EXPANDED_WIDTH
      )} !important;
    }

    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR}):has(.kbnChromeNav-sidePanel) {
      ${targetNavLayoutOverrides(TARGET_NAV_WIDE_WIDTH)}
    }

    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR}):has(.kbnChromeNav-sidePanel)
      ${CHROME_LAYOUT_GRID_SELECTOR} {
      grid-template-columns: ${targetGridTemplateColumns(TARGET_NAV_WIDE_WIDTH)} !important;
    }

    /* ----- Target expanded nav — primary rail ----- */
    ${scope} .kbnChromeNav-root:has(${TARGET_NAV_EXPANDED_SELECTOR}) {
      width: ${TARGET_NAV_EXPANDED_WIDTH}px !important;
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
      --menu-item-text-color: ${targetTextNav} !important;
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
      --menu-item-text-color: ${targetLink} !important;
      background-color: ${targetActiveFill} !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-primaryNavigation']
    [data-menu-item='true'][data-highlighted='true']
    > .euiText {
      color: ${targetLink} !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-primaryNavigation']
    [data-menu-item='true'][data-highlighted='false']:hover {
      background-color: ${targetHoverFill} !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-primaryNavigation']
    [data-menu-item='true']:focus-visible {
      outline: 2px solid ${TARGET_ACCENT} !important;
      outline-offset: -2px !important;
    }

    ${scope}
    .kbnChromeNav-root:has([data-test-subj='sideNavCollapseButton'][aria-pressed='true'])
    [data-test-subj='kbnChromeNav-primaryNavigation']
    [data-menu-item='true']:focus-visible
    .kbnChromeNav-iconWrapper {
      border: none !important;
    }

    /* ----- Target expanded nav — footer labels ----- */
    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR}) [data-test-subj='kbnChromeNav-footer'] {
      align-items: stretch !important;
      gap: 2px !important;
      padding-inline: ${DESIGN_EXPLORATION_GAP}px !important;
    }

    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      > div:not(.sideNavCollapseButtonWrapper),
    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .euiPopover,
    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .euiToolTipAnchor {
      width: 100% !important;
      justify-content: flex-start !important;
    }

    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label] {
      --menu-item-text-color: ${targetTextNav};
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

    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR})
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

    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR})
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

    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]
      .euiButtonIcon__icon,
    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]
      [data-euiicon-type],
    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .sideNavCollapseButtonWrapper[data-footer-label]
      .euiButtonIcon__icon,
    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .sideNavCollapseButtonWrapper[data-footer-label]
      [data-euiicon-type] {
      width: 16px !important;
      height: 16px !important;
    }

    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]:has([data-highlighted='true']) {
      --menu-item-text-color: ${targetLink};
      background-color: ${targetActiveFill} !important;
    }

    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]:has([data-highlighted='false']:hover) {
      background-color: ${targetHoverFill} !important;
    }

    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      [data-footer-label]:has([data-test-subj^='kbnChromeNav-footerItem-']:focus-visible) {
      outline: 2px solid ${TARGET_ACCENT} !important;
      outline-offset: -2px !important;
    }

    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .sideNavCollapseButtonWrapper[data-footer-label]
      .euiToolTipAnchor {
      width: auto !important;
      flex-shrink: 0 !important;
      padding-inline: ${DESIGN_EXPLORATION_GAP}px !important;
    }

    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR})
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

    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .sideNavCollapseButtonWrapper[data-footer-label]:has([data-test-subj='sideNavCollapseButton']:hover) {
      background-color: ${targetHoverFill} !important;
    }

    ${scope}:has(${TARGET_NAV_EXPANDED_SELECTOR})
      [data-test-subj='kbnChromeNav-footer']
      .sideNavCollapseButtonWrapper[data-footer-label]:has([data-test-subj='sideNavCollapseButton']:focus-visible) {
      outline: 2px solid ${TARGET_ACCENT} !important;
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

    ${scope} [data-test-subj='designExplorationNavTopControls'] {
      padding-top: 32px !important;
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
      background-color: ${targetSurfaceNav} !important;
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
    ${scope} [class*='css-'][class*='-secondary_menu--titleStyles'],
    ${scope} [data-test-subj='kbnChromeNav-panelContent'] .euiTitle {
      background-color: transparent !important;
      background: transparent !important;
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
      color: ${targetTextSubdued} !important;
      text-transform: uppercase !important;
    }

    ${scope} .kbnChromeNav-sidePanel
    [data-test-subj^='kbnChromeNav-sidePanelItem-'][data-highlighted='true'],
    ${scope} [data-test-subj*='kbnChromeNav-sidePanel']
      [data-test-subj^='kbnChromeNav-sidePanelItem-'][data-highlighted='true'] {
      --menu-item-text-color: ${targetLink} !important;
      color: ${targetLink} !important;
      background-color: ${targetActiveFill} !important;
    }

    ${scope} .kbnChromeNav-sidePanel
    [data-test-subj^='kbnChromeNav-sidePanelItem-'][data-highlighted='true']
    .euiText,
    ${scope} [data-test-subj*='kbnChromeNav-sidePanel']
      [data-test-subj^='kbnChromeNav-sidePanelItem-'][data-highlighted='true']
      .euiText {
      color: ${targetLink} !important;
    }

    ${scope} .kbnChromeNav-sidePanel
    [data-test-subj^='kbnChromeNav-sidePanelItem-'][data-highlighted='false']:hover,
    ${scope} [data-test-subj*='kbnChromeNav-sidePanel']
      [data-test-subj^='kbnChromeNav-sidePanelItem-'][data-highlighted='false']:hover {
      background-color: ${targetHoverFill} !important;
    }

    /* ----- Dashboard grid & panels ----- */
    /* Wider gutter than Linbana — panels read as individually-bordered cards
       with generous air between them, rather than tightly packed regions of
       one continuous surface. */
    ${scope} [data-test-subj='kbnGridLayout'] {
      --kbnGridGutterSize: ${knobVar('gridGutter')} !important;
      padding: ${knobVar('padding')} !important;
    }

    /* All panels share the 12px panel radius — EUI panels, dashboard cards, empty prompts. */
    ${scope} .euiPanel,
    ${scope} .embPanel,
    ${scope} .euiEmptyPrompt,
    ${scope} [data-test-subj='embeddablePanel'] {
      border-radius: ${knobVar('radiusPanel')} !important;
    }

    /* Agent Builder sidebar: flush edges so panel fill does not punch through the hairline. */
    ${scope} [data-test-subj='agentBuilderWrapper'] .euiPageSidebar .euiPanel {
      border-radius: 0 !important;
    }

    ${scope} [data-test-subj='agentBuilderWrapper'] .euiPageSidebar a {
      border-end-end-radius: 0 !important;
    }

    ${scope} [data-test-subj='embeddablePanel'] {
      border: ${TARGET_HAIRLINE} !important;
      outline: none !important;
      box-shadow: none !important;
      background-color: ${targetSurface} !important;
    }

    ${scope} [data-test-subj='agentBuilderWrapper'] .euiPanel,
    ${scope} [data-test-subj='agentBuilderWrapper'] .embPanel,
    ${scope} [data-test-subj='agentBuilderWrapper'] .euiEmptyPrompt,
    ${scope} [data-test-subj='agentBuilderWrapper'] [data-test-subj='embeddablePanel'] {
      background-color: transparent !important;
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
      background-color: ${targetSurface} !important;
    }

    ${scope} [class*='css-'][class*='-control_panel--formControl'] {
      border: ${TARGET_HAIRLINE} !important;
      border-radius: ${knobVar('radiusControl')} !important;
      box-shadow: none !important;
    }

    ${isDarkMode
      ? `
    ${scope} .kbnFilterButtonGroup .euiButtonGroupButton-isIconOnly,
    ${scope} [data-test-subj='dateRangePickerTimeWindowButtons'] .euiButtonGroupButton-isIconOnly,
    ${scope} [class*='css-'][class*='-euiButtonGroupButton-iconOnly'] {
      background-color: ${targetSurface} !important;
    }
    `
      : ''}

    ${scope} .dshLayout--editing .embPanel__header:hover {
      background-color: ${TARGET_SURFACE_HOVER_FILL} !important;
    }

    ${scope} .embPanel__hoverActionsAnchor .embPanel {
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
      color: ${targetHeading} !important;
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

    ${scope} .echMetric {
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
      border: ${TARGET_HAIRLINE} !important;
      border-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope} .euiFormControlLayout:not(.euiFormControlLayout--group):focus-within:not(:has(:invalid, [aria-invalid='true'])) {
      border: 1px solid ${TARGET_ACCENT} !important;
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
      background-color: ${targetSurface} !important;
    }

    ${scope} .euiFormControlLayout--group:not(:focus-within) {
      overflow: visible !important;
      border: ${TARGET_HAIRLINE} !important;
      border-radius: ${knobVar('radiusControl')} !important;
      box-shadow: none !important;
    }

    ${scope} .euiFormControlLayout--group:not(:focus-within)::after {
      border: none !important;
      box-shadow: none !important;
    }

    /* All EUI buttons share the 8px control radius. Split/group join rules below
       still square the inner corners. */
    ${scope} .euiButton:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary),
    ${scope} .euiButtonEmpty:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary),
    ${scope} .euiButtonIcon:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary),
    ${scope} .euiSplitButton,
    ${scope} .euiButtonDisplay:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary),
    ${scope} [class*='-euiButtonDisplay']:not([class*='euiButtonDisplayContent']):not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary),
    ${scope} [class*='-euiButtonEmpty']:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary),
    ${scope} [class*='-euiButtonIcon']:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary) {
      border-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope} .euiButton:not([class*='fill']):not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary):not(:disabled):hover,
    ${scope} .euiButtonEmpty:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary):not(:disabled):hover,
    ${scope} .euiButtonIcon:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary):not(:disabled):hover,
    ${scope} .euiButtonDisplay:not([class*='fill']):not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary):not(:disabled):hover,
    ${scope} [class*='-euiButtonEmpty']:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary):not(:disabled):hover,
    ${scope} [class*='-euiButtonIcon']:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary):not(:disabled):hover,
    ${scope} [class*='-euiButtonDisplay']:not([class*='euiButtonDisplayContent']):not([class*='fill']):not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary):not(:disabled):hover,
    ${scope} .euiSplitButton:not(:has([class*='fill'])):hover {
      background-color: ${targetHoverFill} !important;
    }

    ${scope} .euiButton:not([class*='fill']):not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary):not(:disabled):active,
    ${scope} .euiButtonEmpty:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary):not(:disabled):active,
    ${scope} .euiButtonIcon:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary):not(:disabled):active,
    ${scope} .euiButtonDisplay:not([class*='fill']):not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary):not(:disabled):active,
    ${scope} [class*='-euiButtonEmpty']:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary):not(:disabled):active,
    ${scope} [class*='-euiButtonIcon']:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary):not(:disabled):active,
    ${scope} .euiButtonEmpty:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary)[aria-pressed='true'],
    ${scope} .euiButtonIcon:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary)[aria-pressed='true'] {
      background-color: ${targetActiveFill} !important;
    }

    /* Inner label layer. The euiButtonDisplay substring also matches
       euiButtonDisplayContent, which stacked a second rounded fill. */
    ${scope} .euiButtonDisplayContent,
    ${scope} [class*='euiButtonDisplayContent'],
    ${scope} .euiButtonEmpty__content,
    ${scope} .euiButton__content,
    ${scope} .euiFilterButton__text {
      background: transparent !important;
      background-color: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }

    ${scope} .euiButtonGroup,
    ${scope} .euiButtonGroup__buttons {
      border-radius: ${knobVar('radiusControl')} !important;
      overflow: hidden;
    }

    ${scope} .euiButtonGroup .euiButtonGroupButton,
    ${scope} .euiButtonGroup [class*='-euiButtonDisplay'],
    ${scope} .euiButtonGroup .euiButtonIcon {
      border-radius: 0 !important;
    }

    ${scope} .euiFilterGroup {
      position: relative !important;
      border: none !important;
      border-radius: ${knobVar('radiusControl')} !important;
      overflow: hidden;
      box-shadow: none !important;
    }

    ${scope} .euiFilterGroup::after {
      content: '' !important;
      position: absolute;
      inset: 0;
      z-index: 1;
      border: none !important;
      box-shadow: ${TARGET_HAIRLINE_INSET_SHADOW} !important;
      border-radius: inherit;
      pointer-events: none;
    }

    ${scope} .euiFilterGroup .euiFilterButton,
    ${scope} .euiFilterGroup .euiFilterButton__wrapper,
    ${scope} .euiFilterGroup .euiPopover,
    ${scope} .euiFilterGroup .euiButtonDisplay,
    ${scope} .euiFilterGroup [class*='-euiButtonDisplay'],
    ${scope} .euiFilterGroup [class*='-euiFilterButton'] {
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }

    ${scope} .euiFilterGroup .euiFilterButton::before,
    ${scope} .euiFilterGroup .euiFilterButton::after,
    ${scope} .euiFilterGroup [class*='euiFilterButton']::before,
    ${scope} .euiFilterGroup [class*='euiFilterButton']::after,
    ${scope} .euiFilterGroup .euiButtonDisplay::before,
    ${scope} .euiFilterGroup .euiButtonDisplay::after,
    ${scope} .euiFilterGroup [class*='-euiButtonDisplay']::before,
    ${scope} .euiFilterGroup [class*='-euiButtonDisplay']::after {
      content: none !important;
      display: none !important;
      border: none !important;
      border-inline-start: none !important;
      background: none !important;
      box-shadow: none !important;
    }

    /* One divider only, on the group’s direct children — not nested wrappers. */
    ${scope} .euiFilterGroup > *:not(:last-child) {
      border-inline-end: ${TARGET_HAIRLINE} !important;
    }

    /* Primary / accent buttons: flat fill, no gradient, no border. */
    ${scope} [class*='css-'][class*='-euiButtonDisplay'][class*='fill']:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary) {
      border: none !important;
      box-shadow: none !important;
      border-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope} .euiSplitButtonActionPrimary {
      border-start-start-radius: ${knobVar('radiusControl')} !important;
      border-end-start-radius: ${knobVar('radiusControl')} !important;
      border-start-end-radius: 0 !important;
      border-end-end-radius: 0 !important;
      padding-left: 12px !important;
      padding-right: 0 !important;
    }

    ${scope} .euiSplitButtonActionSecondary {
      border-start-end-radius: ${knobVar('radiusControl')} !important;
      border-end-end-radius: ${knobVar('radiusControl')} !important;
      border-start-start-radius: 0 !important;
      border-end-start-radius: 0 !important;
      padding-right: 4px !important;
    }

    /* Empty/text split buttons: fill lives on the shell only. Inner actions
       keep their own hover and stack a second translucent layer. */
    ${scope} .euiSplitButtonActionPrimary:not([class*='fill']),
    ${scope} .euiSplitButtonActionPrimary:not([class*='fill']):hover,
    ${scope} .euiSplitButtonActionPrimary:not([class*='fill']):active,
    ${scope} .euiSplitButtonActionPrimary:not([class*='fill'])[aria-pressed='true'],
    ${scope} .euiSplitButtonActionPrimary:not([class*='fill']) .euiButtonDisplay,
    ${scope} .euiSplitButtonActionPrimary:not([class*='fill']) [class*='-euiButtonDisplay'],
    ${scope} .euiSplitButtonActionSecondary:not([class*='fill']),
    ${scope} .euiSplitButtonActionSecondary:not([class*='fill']):hover,
    ${scope} .euiSplitButtonActionSecondary:not([class*='fill']):active,
    ${scope} .euiSplitButtonActionSecondary:not([class*='fill'])[aria-pressed='true'] {
      background: transparent !important;
      background-color: transparent !important;
    }

    ${scope} [data-test-subj='globalQueryBar'] {
      padding: ${knobVar('padding')} !important;
      padding-block-start: 16px !important;
      padding-block-end: ${DESIGN_EXPLORATION_PADDING_COMPACT}px !important;
    }

    ${scope}
    .euiFormControlLayout:has([data-test-subj='queryInput']):not(:focus-within):not(:has(:invalid, [aria-invalid='true'])) {
      border: none !important;
      border-radius: ${knobVar('radiusControl')} !important;
      box-shadow: ${TARGET_HAIRLINE_INSET_SHADOW} !important;
    }

    ${scope}
    .euiFormControlLayout:has([data-test-subj='queryInput']):focus-within:not(:has(:invalid, [aria-invalid='true'])) {
      border: none !important;
      box-shadow: ${TARGET_ACCENT_INSET_SHADOW} !important;
    }

    /* Date picker button is opaque, so layout inset-shadow never shows.
       Draw the hairline on top, same overlay as the time-window group. */
    ${scope} [data-test-subj='dateRangePickerControlWrapper'] .euiFormControlLayout:not(:has(:invalid, [aria-invalid='true'])):not(:has(:disabled)) {
      position: relative !important;
      border: none !important;
      border-radius: ${knobVar('radiusControl')} !important;
      overflow: hidden !important;
      background-color: ${targetSurface} !important;
      box-shadow: none !important;
    }

    ${scope} [data-test-subj='dateRangePickerControlWrapper'] .euiFormControlLayout:not(:has(:invalid, [aria-invalid='true'])):not(:has(:disabled))::after {
      content: '' !important;
      position: absolute;
      inset: 0;
      z-index: 1;
      border: none !important;
      box-shadow: ${TARGET_HAIRLINE_INSET_SHADOW} !important;
      border-radius: inherit;
      pointer-events: none;
    }

    ${scope} [data-test-subj='dateRangePickerControlWrapper'] .euiFormControlLayout:focus-within:not(:has(:invalid, [aria-invalid='true']))::after {
      box-shadow: ${TARGET_ACCENT_INSET_SHADOW} !important;
    }

    /* Filter bar +/- and menu buttons: match query bar hairline + control radius. */
    ${scope} .kbnFilterButtonGroup {
      border-radius: ${knobVar('radiusControl')} !important;
      overflow: hidden;
      background-color: ${targetSurface} !important;
      width: fit-content;
    }

    ${scope} .kbnFilterButtonGroup::after {
      border: none !important;
      box-shadow: ${TARGET_HAIRLINE_INSET_SHADOW} !important;
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
      background-color: ${targetSurface} !important;
      position: relative;
      width: fit-content;
    }

    ${scope} [data-test-subj='dateRangePickerTimeWindowButtons']::after {
      content: '' !important;
      position: absolute;
      inset: 0;
      border: none !important;
      box-shadow: ${TARGET_HAIRLINE_INSET_SHADOW} !important;
      border-radius: inherit;
      pointer-events: none;
    }

    ${scope} [data-test-subj='dateRangePickerTimeWindowButtons'] .euiButtonGroup__buttons {
      border-radius: inherit !important;
      align-items: stretch;
    }

    ${scope} [data-test-subj='dateRangePickerTimeWindowButtons'] .euiButtonGroup__buttons > *:not(:last-child) {
      border-right: ${TARGET_HAIRLINE} !important;
    }

    ${scope} [data-test-subj='dateRangePickerTimeWindowButtons'] .euiButtonGroupButton::before {
      display: none !important;
    }

    ${scope} [data-test-subj='dateRangePickerTimeWindowButtons'] .euiButtonGroupButton {
      border: none !important;
      margin-inline-start: 0 !important;
      background-color: ${targetSurface} !important;
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
      box-shadow: ${TARGET_HAIRLINE_INSET_SHADOW} !important;
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
      background-color: ${targetSurface} !important;
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
      box-shadow: ${TARGET_HAIRLINE_INSET_SHADOW} !important;
      background-color: ${targetSurface} !important;
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

    ${scope} .euiTab__content,
    ${scope} [class*='css-'][class*='-euiTab__content'] {
      line-height: 32px !important;
    }

    ${scope} [class*='css-'][class*='-euiTab__content-m'] {
      font-weight: 500 !important;
    }

    ${scope} .euiTab:not(.euiTab-isSelected):not([aria-selected='true']) {
      color: ${colors.textSubdued} !important;
    }

    ${scope} .euiTab.euiTab-isSelected,
    ${scope} .euiTab[aria-selected='true'] {
      color: ${targetText} !important;
    }

    ${scope} .euiTab.euiTab-isSelected::after,
    ${scope} .euiTab[aria-selected='true']::after {
      border-color: ${colors.primary} !important;
    }

    /* ----- App header ----- */
    /* Flat, static, no glass/blur — same philosophy as Linbana. */
    ${scope} [data-test-subj='appHeader'] > div:not([data-test-subj='appHeaderTabs']) {
      padding-block-start: ${knobVar('padding')} !important;
    }

    ${scope} [data-test-subj='appHeaderTabs'] {
      padding-block: 0 !important;
    }

    /* Discover: session tabs arrive via titleAppend (same primary row as the
       title). Stack title + tabs so the menu stays on the title row — POC
       stand-in for a real AppHeader tabsContent slot.
       Selectors follow AppHeaderShell DOM, not Emotion labels. */
    ${scope} [data-test-subj='appHeader']:has([data-test-subj='unifiedTabs_tabsBar']) > div:first-child {
      align-items: flex-start !important;
    }

    ${scope} [data-test-subj='appHeader']:has([data-test-subj='unifiedTabs_tabsBar'])
      > div:first-child
      > div:first-child {
      flex-direction: column !important;
      align-items: stretch !important;
    }

    ${scope} [data-test-subj='appHeader']:has([data-test-subj='unifiedTabs_tabsBar'])
      > div:first-child
      > div:first-child
      > div:first-child,
    ${scope} [data-test-subj='appHeader']:has([data-test-subj='unifiedTabs_tabsBar'])
      > div:first-child
      > div:first-child
      > div:has([data-test-subj='unifiedTabs_tabsBar']) {
      max-width: none !important;
      width: 100% !important;
      flex: 0 0 auto !important;
    }

    ${scope} [data-test-subj='appHeader']:has([data-test-subj='unifiedTabs_tabsBar'])
      > div:first-child
      > div:first-child
      > div:has([data-test-subj='unifiedTabs_tabsBar']) {
      justify-content: flex-start !important;
      margin-block-start: 16px !important;
    }

    ${scope} [data-test-subj='appHeader']:has([data-test-subj='unifiedTabs_tabsBar']) {
      padding-inline: 24px !important;
      border-block-end: none !important;
    }

    ${scope} [data-test-subj='dataView-add-field_btn'] {
      border-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope} [class*='css-'][class*='-tab_with_background--TabWithBackground'],
    ${scope} [data-test-subj='unifiedTabs_tabsBar'] [data-test-subj^='unifiedTabs_tab_'] {
      margin-inline: 0 !important;
      padding-inline: 0 !important;
    }

    ${scope} [class*='css-'][class*='-tab--getTabContentCss'] {
      height: 32px !important;
    }

    ${scope} [class*='css-'][class*='-tab--getTabContainerCss'] .unifiedTabs__tabActions {
      top: 4px !important;
    }

    ${scope} [data-test-subj='appHeader'] {
      border-block-end: ${TARGET_HAIRLINE} !important;
      background-color: ${targetSurface} !important;
    }

    ${scope}${DASHBOARDS_APP_HAS_SELECTOR} [data-test-subj='appHeader'] {
      padding-inline: ${knobVar('padding')} !important;
      margin-inline: 0 !important;
      margin-top: 0 !important;
      border-radius: 0 !important;
      border-top: none !important;
      border-inline: none !important;
      box-shadow: none !important;
      background-color: ${targetSurface} !important;
    }

    /* Title width is driven by a hidden sizer span in the same grid cell as
       appHeaderTitle — typography must live on a shared ancestor, not the
       visible span alone, or the grid cell over-sizes and leaves a gap before
       title actions (share). */
    ${scope} [data-test-subj='appHeader'] .euiTitle h1 {
      font-size: 14px !important;
      font-weight: 600 !important;
    }

    ${scope} .echMetricText__title,
    ${scope} .echMetricText__title span {
      font-size: 14px !important;
      font-weight: 600 !important;
      color: ${targetHeading} !important;
    }

    ${scope} .echMetricText {
      padding: 0 !important;
      color: ${targetTextNav} !important;
    }

    ${scope} .echMetricText__value,
    ${scope} .echMetricText__value .echMetricText__part {
      color: ${targetTextNav} !important;
    }

    ${scope} .echMetricText__title,
    ${scope} .echMetricText__title span,
    ${scope} .echMetricText__subtitle {
      padding-left: 0 !important;
    }

    ${scope} .echMetricText__subtitle {
      color: ${targetTextSubdued} !important;
      font-size: 12px !important;
      font-weight: 400 !important;
      padding-top: 2px !important;
    }

    ${scope} [data-test-subj='appHeader'] [class*='css-'][class*='-euiButtonDisplay'][class*='app_menu_action_button--buttonCss'] {
      background-color: transparent !important;
      border-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope} [data-test-subj='appHeader'] [data-test-subj^='app-menu-action-button-']:hover
      [class*='app_menu_action_button--buttonCss'],
    ${scope} [data-test-subj='appHeader'] [data-test-subj^='app-menu-action-button-']:focus
      [class*='app_menu_action_button--buttonCss'] {
      background-color: ${targetHoverFill} !important;
      border-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope} [data-test-subj='appHeader'] [class*='css-'][class*='-euiButtonDisplay-euiButtonEmpty'][class*='app_menu_item--buttonCss'] {
      border-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope} [data-test-subj='appHeader'] [class*='css-'][class*='-euiButtonIcon']:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary) {
      border-radius: ${knobVar('radiusControl')} !important;
    }

    ${scope} [data-test-subj='appHeader'] .euiSplitButtonActionPrimary {
      border-start-start-radius: ${knobVar('radiusControl')} !important;
      border-end-start-radius: ${knobVar('radiusControl')} !important;
      border-start-end-radius: 0 !important;
      border-end-end-radius: 0 !important;
      padding-inline-end: 12px !important;
    }

    ${scope} [data-test-subj='appHeader'] .euiSplitButtonActionSecondary {
      border-start-end-radius: ${knobVar('radiusControl')} !important;
      border-end-end-radius: ${knobVar('radiusControl')} !important;
      border-start-start-radius: 0 !important;
      border-end-start-radius: 0 !important;
    }

    /* Chrome-owned top-bar slot only. Dashboards render AppHeader inline in
       app content — do not reserve this 80px there or the header is pushed down. */
    ${scope} .kbnChromeLayoutApplication:has(.kbnChromeLayoutApplicationTopBar) {
      --kbn-application--top-bar-height: ${TARGET_TOP_BAR_HEIGHT}px !important;
    }

    ${scope} .kbnChromeLayoutApplication:not(:has(.kbnChromeLayoutApplicationTopBar)) {
      --kbn-application--top-bar-height: 0px !important;
      --kbn-application--sticky-headers-offset: 0px !important;
      --kbnAppHeadersOffset: 0px !important;
    }

    /* Opaque topBar shell — never faded — so scroll content cannot bleed through on reveal.
       Hairline lives on the shell, not appHeader: fixed height + overflow:hidden clips the
       header's bottom border on dashboard detail view. */
    ${scope}:has(${DASHBOARD_CONTAINER_SELECTOR}) .kbnChromeLayoutApplicationTopBar {
      height: ${TARGET_TOP_BAR_HEIGHT}px !important;
      min-height: 0 !important;
      opacity: 1 !important;
      overflow: hidden !important;
      background-color: ${targetSurface} !important;
      border-block-end: ${TARGET_HAIRLINE} !important;
      transition: height ${TARGET_APP_HEADER_TRANSITION_MS}ms ease !important;
    }

    ${scope}:has(${DASHBOARD_CONTAINER_SELECTOR})
      .kbnChromeLayoutApplicationTopBar
      [data-test-subj='appHeader'] {
      border-block-end: none !important;
      margin-bottom: 0 !important;
    }

    ${scope}${DASHBOARDS_APP_HAS_SELECTOR} [data-test-subj='appHeader'] {
      opacity: 1 !important;
      position: relative !important;
      top: auto !important;
    }

    ${scope}${DASHBOARDS_APP_HAS_SELECTOR} [data-test-subj='appHeader'] > div:not([data-test-subj='appHeaderTabs']) {
      padding-block: ${knobVar('padding')} !important;
      opacity: 1;
      transition: opacity ${TARGET_APP_HEADER_TRANSITION_MS}ms ease
        ${TARGET_APP_HEADER_TRANSITION_MS}ms !important;
    }

    ${scope} [data-test-subj='workflowsPage'] [data-test-subj='appHeader'] {
      padding-inline: ${knobVar('padding')} !important;
    }

    ${scope} [data-test-subj='workflowsPage'] [data-test-subj='appHeader'] > div:not([data-test-subj='appHeaderTabs']) {
      padding-block: ${knobVar('padding')} !important;
    }

    ${scope} .kbnChromeLayoutApplication div:has(> [data-test-subj='appHeader']) {
      width: 100% !important;
      margin: 0 !important;
      min-height: 48px !important;
    }

    ${scope} .kbnChromeLayoutApplication {
      background-color: ${targetSurface} !important;
      border: ${TARGET_HAIRLINE} !important;
      border-radius: ${knobVar('radiusContainer')} !important;
      box-shadow: ${targetShellShadow} !important;
      outline: none !important;
      margin-right: 8px !important;
    }

    /* Dashboard search bar + controls stick to the application scrollport. */
    ${scope} .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      position: sticky !important;
      z-index: ${levels.mask} !important;
      width: 100% !important;
      border-block-end: ${TARGET_HAIRLINE} !important;
      box-shadow: none !important;
      background-color: ${targetSurface} !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      margin-inline: 0 !important;
      transition: top ${TARGET_APP_HEADER_TRANSITION_MS}ms ease !important;
    }

    ${scope} .kbnChromeLayoutApplication:has(.kbnChromeLayoutApplicationTopBar)
      div:has(> #dashboardTitle) {
      top: ${TARGET_TOP_BAR_HEIGHT}px !important;
    }

    ${scope} .kbnChromeLayoutApplication:not(:has(.kbnChromeLayoutApplicationTopBar))
      div:has(> #dashboardTitle) {
      top: 0 !important;
    }

    /* Fullscreen hides chrome — no app header to offset against; pin top nav immediately. */
    ${scope}:has(.dshDashboardViewportWrapper--isFullscreen) .kbnChromeLayoutApplication {
      --kbn-application--sticky-headers-offset: 0px !important;
      --kbnAppHeadersOffset: 0px !important;
      border: none !important;
      border-radius: 0 !important;
    }

    ${scope}:has(.dshDashboardViewportWrapper--isFullscreen)
      .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      top: 0 !important;
    }

    ${scope}[${DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR}='true']:has(${DASHBOARD_CONTAINER_SELECTOR})
      .kbnChromeLayoutApplication:has(.kbnChromeLayoutApplicationTopBar) {
      --kbn-application--top-bar-height: 0px !important;
      --kbn-application--sticky-headers-offset: 0px !important;
      --kbnAppHeadersOffset: 0px !important;
    }

    ${scope}[${DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR}='true']:has(${DASHBOARD_CONTAINER_SELECTOR})
      .kbnChromeLayoutApplicationTopBar {
      height: 0 !important;
      min-height: 0 !important;
      overflow: hidden !important;
      pointer-events: none !important;
      transition: height ${TARGET_APP_HEADER_TRANSITION_MS}ms ease
        ${TARGET_APP_HEADER_TRANSITION_MS}ms !important;
    }

    ${scope}[${DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR}='true']:has(${DASHBOARD_CONTAINER_SELECTOR})
      [data-test-subj='appHeader'] > div {
      opacity: 0 !important;
      pointer-events: none !important;
      transition: opacity ${TARGET_APP_HEADER_TRANSITION_MS}ms ease !important;
    }

    ${scope}[${DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR}='true']:has(${DASHBOARD_CONTAINER_SELECTOR})
      .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      top: 0 !important;
      transition: top ${TARGET_APP_HEADER_TRANSITION_MS}ms ease
        ${TARGET_APP_HEADER_TRANSITION_MS}ms !important;
    }

    ${scope}[${DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR}='true']:has(${DASHBOARD_CONTAINER_SELECTOR})
      .kbnChromeLayoutApplication:not(:has(.kbnChromeLayoutApplicationTopBar))
      div:has(> #dashboardTitle)
      [data-test-subj='appHeader'] {
      height: 0 !important;
      min-height: 0 !important;
      overflow: hidden !important;
      opacity: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      pointer-events: none !important;
      border: none !important;
    }

    ${scope}[${DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR}='true']:has(${DASHBOARD_CONTAINER_SELECTOR})
      .kbnChromeLayoutApplication:not(:has(.kbnChromeLayoutApplicationTopBar))
      div:has(> [data-test-subj='appHeader']) {
      min-height: 0 !important;
    }

    ${scope}[${DESIGN_EXPLORATION_SCROLLED_BODY_ATTR}='true']:has(${DASHBOARD_CONTAINER_SELECTOR})
      .kbnChromeLayoutApplicationTopBar {
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
      background-color: ${targetAppSurface} !important;
    }
  `;
};
