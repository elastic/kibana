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
import { layoutVar } from '@kbn/ui-chrome-layout-constants';
import type { LayoutConfig } from '../layout_config_context';

/** Gutter between nav, agent, and application panels. */
export const AGENT_FIRST_GAP = 8;

/** Border radius for chrome panel containers. */
export const AGENT_FIRST_RADIUS_CONTAINER = 12;

/** Border radius for buttons and inputs inside chrome panels. */
export const AGENT_FIRST_RADIUS_CONTROL = 8;

/** Hairline outline on panel containers. */
export const AGENT_FIRST_BORDER_WIDTH = 0.5;

/** Default inner padding for nav panel content. */
export const AGENT_FIRST_PADDING = 16;

export const AGENT_FIRST_BODY_ATTR = 'data-agent-first-chrome';

const AGENT_WORKSPACE_ACTIVE_ATTR = 'data-agent-workspace-active';

const NAV_SIDE_PANEL_CLASS = 'kbnChromeNav-sidePanel';

export const AGENT_FIRST_LAYOUT_OVERRIDES: Pick<
  LayoutConfig,
  'applicationMarginRight' | 'applicationMarginBottom' | 'applicationMarginTop' | 'headerHeight'
> = {
  applicationMarginRight: AGENT_FIRST_GAP,
  applicationMarginBottom: AGENT_FIRST_GAP,
  applicationMarginTop: AGENT_FIRST_GAP,
  headerHeight: 0,
};

const panelSelectorList = [
  '.kbnChromeLayoutNavigation',
  '.kbnChromeLayoutAgent',
  '.kbnChromeLayoutApplication',
];

const panelSelectors = panelSelectorList.join(', ');

const controlSelectors = [
  '.euiButton:not(.euiSplitButtonActionPrimary):not(.euiSplitButtonActionSecondary)',
  '.euiButtonEmpty',
  '.euiButtonIcon:not(.euiSplitButtonActionSecondary)',
  '.euiFieldText',
  '.euiFieldNumber',
  '.euiFieldSearch',
  '.euiTextArea',
  '.euiSelect',
  '.euiFormControlLayout',
  '.euiSuperSelectControl',
  '.euiComboBox',
].join(', ');

const emptyButtonPseudoSelectors = [
  '.euiButtonEmpty::before',
  '.euiButtonEmpty:hover::before',
  '.euiButtonEmpty:focus::before',
  '.euiButtonEmpty:focus-visible::before',
].join(', ');

const splitButtonActionSelectors = [
  '.euiSplitButtonActionPrimary',
  '.euiSplitButtonActionSecondary',
].join(', ');

const buttonGroupPartSelectors = [
  '.euiButtonGroupButton',
  '.euiButtonGroupButton-isIconOnly',
  '.euiButtonGroup__tooltipWrapper',
].join(', ');

const buttonGroupPartStateSelectors = [
  '.euiButtonGroupButton:hover',
  '.euiButtonGroupButton:focus',
  '.euiButtonGroupButton:active',
  '.euiButtonGroupButton:focus-visible',
  '.euiButtonGroupButton-isSelected',
  '.euiButtonGroup__tooltipWrapper-isSelected .euiButtonGroupButton',
].join(', ');

const buttonGroupPartPseudoSelectors = [
  '.euiButtonGroupButton::before',
  '.euiButtonGroupButton::after',
  '.euiButtonGroupButton:hover::before',
  '.euiButtonGroupButton:hover::after',
  '.euiButtonGroupButton:active::before',
  '.euiButtonGroupButton:active::after',
  '.euiButtonGroupButton-isSelected::before',
  '.euiButtonGroupButton-isSelected::after',
  '.euiButtonGroup__tooltipWrapper::before',
  '.euiButtonGroup__tooltipWrapper::after',
].join(', ');

const buttonGroupPartChildSelectors = [
  '.euiButtonGroup__buttons > :first-child',
  '.euiButtonGroup__buttons > :last-child',
  '.euiButtonGroupButton:first-child',
  '.euiButtonGroupButton:last-child',
  '.euiButtonGroup__tooltipWrapper:first-child',
  '.euiButtonGroup__tooltipWrapper:last-child',
].join(', ');

const DATA_TABLE_TOOLBAR_CONTROL_GROUP_CLASS = 'unifiedDataTableToolbarControlGroup';
const DATA_TABLE_TOOLBAR_ICON_BUTTON_CLASS = 'unifiedDataTableToolbarControlIconButton';

const dataTableToolbarControlGroupPartSelectors = [
  `.${DATA_TABLE_TOOLBAR_ICON_BUTTON_CLASS}`,
  `.${DATA_TABLE_TOOLBAR_CONTROL_GROUP_CLASS} .euiButtonIcon`,
].join(', ');

const dataTableToolbarControlGroupPartChildSelectors = [
  `.${DATA_TABLE_TOOLBAR_CONTROL_GROUP_CLASS} > :first-child`,
  `.${DATA_TABLE_TOOLBAR_CONTROL_GROUP_CLASS} > :last-child`,
  `.${DATA_TABLE_TOOLBAR_ICON_BUTTON_CLASS}:first-child`,
  `.${DATA_TABLE_TOOLBAR_ICON_BUTTON_CLASS}:last-child`,
].join(', ');

const dataTableToolbarControlGroupPseudoSelectors = [
  `.${DATA_TABLE_TOOLBAR_CONTROL_GROUP_CLASS}::before`,
  `.${DATA_TABLE_TOOLBAR_CONTROL_GROUP_CLASS}::after`,
].join(', ');

const dataTableToolbarControlGroupSiblingSelectors = [
  `.${DATA_TABLE_TOOLBAR_ICON_BUTTON_CLASS} + .${DATA_TABLE_TOOLBAR_ICON_BUTTON_CLASS}`,
].join(', ');

const FILTER_BUTTON_GROUP_CLASS = 'kbnFilterButtonGroup';

const filterButtonGroupPartSelectors = [
  `.${FILTER_BUTTON_GROUP_CLASS} > .euiFlexItem`,
  `.${FILTER_BUTTON_GROUP_CLASS} .euiButton`,
  `.${FILTER_BUTTON_GROUP_CLASS} .euiButtonIcon`,
].join(', ');

const filterButtonGroupPartChildSelectors = [
  `.${FILTER_BUTTON_GROUP_CLASS} > :first-child`,
  `.${FILTER_BUTTON_GROUP_CLASS} > :last-child`,
  `.${FILTER_BUTTON_GROUP_CLASS} > .euiFlexItem:first-child`,
  `.${FILTER_BUTTON_GROUP_CLASS} > .euiFlexItem:last-child`,
].join(', ');

const filterButtonGroupPseudoSelectors = [
  `.${FILTER_BUTTON_GROUP_CLASS}::before`,
  `.${FILTER_BUTTON_GROUP_CLASS}::after`,
].join(', ');

const filterButtonGroupSiblingSelectors = [
  `.${FILTER_BUTTON_GROUP_CLASS} > *:not(:last-of-type)`,
  `.${FILTER_BUTTON_GROUP_CLASS} > .euiFlexItem:not(:last-of-type)`,
].join(', ');

const unifiedControlGroupWrapperSelectors = [
  '.euiButtonGroup__buttons',
  `.${DATA_TABLE_TOOLBAR_CONTROL_GROUP_CLASS}`,
  `.${FILTER_BUTTON_GROUP_CLASS}`,
].join(', ');

const unifiedControlGroupPartSelectors = [
  buttonGroupPartSelectors,
  dataTableToolbarControlGroupPartSelectors,
  filterButtonGroupPartSelectors,
  `.${FILTER_BUTTON_GROUP_CLASS} .euiButtonEmpty`,
  `.${DATA_TABLE_TOOLBAR_CONTROL_GROUP_CLASS} .euiDataGridToolbarControl`,
  `.${DATA_TABLE_TOOLBAR_CONTROL_GROUP_CLASS} .euiButtonEmpty`,
].join(', ');

const unifiedControlGroupPartStateSelectors = buttonGroupPartStateSelectors;

const unifiedControlGroupPartChildSelectors = [
  buttonGroupPartChildSelectors,
  dataTableToolbarControlGroupPartChildSelectors,
  filterButtonGroupPartChildSelectors,
].join(', ');

const unifiedControlGroupPartPseudoSelectors = [
  buttonGroupPartPseudoSelectors,
  dataTableToolbarControlGroupPseudoSelectors,
  filterButtonGroupPseudoSelectors,
].join(', ');

const unifiedControlGroupSiblingSelectors = [
  dataTableToolbarControlGroupSiblingSelectors,
  filterButtonGroupSiblingSelectors,
].join(', ');

const unifiedControlGroupEmptyPseudoSelectors = [
  `.${FILTER_BUTTON_GROUP_CLASS} .euiButtonEmpty::before`,
  `.${FILTER_BUTTON_GROUP_CLASS} .euiButtonEmpty:hover::before`,
  `.${FILTER_BUTTON_GROUP_CLASS} .euiButtonEmpty:focus::before`,
  `.${FILTER_BUTTON_GROUP_CLASS} .euiButtonEmpty:focus-visible::before`,
  `.${DATA_TABLE_TOOLBAR_CONTROL_GROUP_CLASS} .euiDataGridToolbarControl::before`,
  `.${DATA_TABLE_TOOLBAR_CONTROL_GROUP_CLASS} .euiDataGridToolbarControl:hover::before`,
  `.${DATA_TABLE_TOOLBAR_CONTROL_GROUP_CLASS} .euiDataGridToolbarControl:focus-visible::before`,
  `.${DATA_TABLE_TOOLBAR_CONTROL_GROUP_CLASS} .euiButtonEmpty::before`,
  `.${DATA_TABLE_TOOLBAR_CONTROL_GROUP_CLASS} .euiButtonEmpty:hover::before`,
  `.${DATA_TABLE_TOOLBAR_CONTROL_GROUP_CLASS} .euiButtonEmpty:focus-visible::before`,
].join(', ');

const buttonGroupHoverSelectors = [
  '.euiButtonGroupButton:not(:disabled):hover',
  '.euiButtonGroupButton:not(:disabled):focus-visible',
].join(', ');

const subduedTextSelectors = [
  '.euiText',
  '.euiTitle',
  '.euiListGroupItem__label',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'label',
].join(', ');

const emphaticTextSelectors = [
  '[aria-selected="true"]',
  '[aria-current="true"]',
  '.euiListGroupItem-isSelected',
  '.euiButtonFill',
  '.euiButtonColorPrimary',
  '.euiButtonColorSuccess',
  '.euiButtonColorDanger',
  '.euiButtonColorWarning',
  '.euiButton-isSelected',
  '.euiButtonGroupButton-isSelected',
  'input',
  'textarea',
  'select',
  'a:focus-visible',
  'button:focus-visible',
].join(', ');

const agentFirstChromeStyles = (euiTheme: UseEuiTheme) => {
  const { colors, shadows, components } = euiTheme.euiTheme;
  const scope = `body[${AGENT_FIRST_BODY_ATTR}='true']`;
  const containerRadius = `${AGENT_FIRST_RADIUS_CONTAINER}px`;
  const controlRadius = `${AGENT_FIRST_RADIUS_CONTROL}px`;

  /** Scope descendant selectors to each chrome panel under the agent-first body attr. */
  const scopedInPanels = (selectors: string) =>
    selectors
      .split(', ')
      .flatMap((selector) => panelSelectorList.map((panel) => `${scope} ${panel} ${selector}`))
      .join(', ');

  return css`
    html:has(body[${AGENT_FIRST_BODY_ATTR}='true']) {
      background: ${colors.backgroundBaseSubdued} !important;
    }

    ${scope} .kbnChromeLayoutNavigation,
    ${scope} .kbnChromeLayoutAgent,
    ${scope} .kbnChromeLayoutApplication,
    ${scope} .${NAV_SIDE_PANEL_CLASS} {
      border-radius: ${containerRadius} !important;
      outline-width: ${AGENT_FIRST_BORDER_WIDTH}px !important;
      outline-color: ${colors.borderBaseSubdued} !important;
      box-shadow: ${shadows.xs} !important;
    }

    ${scope} .kbnChromeLayoutNavigation {
      margin-top: ${layoutVar('application.marginTop')} !important;
      margin-bottom: ${layoutVar('application.marginBottom')} !important;
      height: calc(
        100% - ${layoutVar('application.marginTop')} - ${layoutVar('application.marginBottom')}
      ) !important;
    }

    /* Agent column: no left gutter */
    ${scope} .kbnChromeLayoutAgent {
      margin-top: ${layoutVar('application.marginTop')} !important;
      margin-left: 0 !important;
      height: calc(
        100% - ${layoutVar('application.marginTop')} - ${layoutVar('application.marginBottom')}
      ) !important;
      width: calc(
        100% - ${layoutVar('application.marginRight')} - ${layoutVar('agent.marginLeft', '0px')}
      ) !important;
    }

    ${scope} .kbnChromeLayoutApplication {
      margin-top: ${layoutVar('application.marginTop')} !important;
      height: calc(
        100% - ${layoutVar('application.marginTop')} - ${layoutVar('application.marginBottom')}
      ) !important;
      width: calc(100% - ${layoutVar('application.marginRight')}) !important;
    }

    @media screen {
      ${scope} .kbnChromeLayoutNavigation,
      ${scope} .kbnChromeLayoutAgent,
      ${scope} .kbnChromeLayoutApplication {
        height: calc(
          100% - ${layoutVar('application.marginTop')} - ${layoutVar('application.marginBottom')}
        ) !important;
      }
    }

    ${scope} .${NAV_SIDE_PANEL_CLASS} .euiSplitPanel__inner {
      padding: ${AGENT_FIRST_PADDING}px;
    }

    /* Nav menu items: 8px icon affordance (overrides menu_item emotion styles) */
    ${scope} .kbnChromeLayoutNavigation [data-menu-item] .kbnChromeNav-iconWrapper,
    ${scope} .${NAV_SIDE_PANEL_CLASS} [data-menu-item] .kbnChromeNav-iconWrapper {
      border-radius: ${controlRadius} !important;
    }

    ${scope} .kbnChromeLayoutNavigation [data-menu-item] .kbnChromeNav-iconWrapper::before,
    ${scope} .${NAV_SIDE_PANEL_CLASS} [data-menu-item] .kbnChromeNav-iconWrapper::before {
      border-radius: ${controlRadius} !important;
    }

    ${scope} ${panelSelectors} ${controlSelectors} {
      border-radius: ${controlRadius} !important;
    }

    /* EuiButtonEmpty hover overlay (::before) uses EUI small radius — match 8px controls */
    ${scopedInPanels(emptyButtonPseudoSelectors)} {
      border-radius: ${controlRadius} !important;
      border-start-start-radius: ${controlRadius} !important;
      border-start-end-radius: ${controlRadius} !important;
      border-end-start-radius: ${controlRadius} !important;
      border-end-end-radius: ${controlRadius} !important;
    }

    ${scopedInPanels(
      '.euiButtonEmpty:hover, .euiButtonEmpty:focus, .euiButtonEmpty:focus-visible'
    )} {
      border-radius: ${controlRadius} !important;
      border-start-start-radius: ${controlRadius} !important;
      border-start-end-radius: ${controlRadius} !important;
      border-end-start-radius: ${controlRadius} !important;
      border-end-end-radius: ${controlRadius} !important;
    }

    /* EuiSplitButton: round the group, not each part — inner join stays square */
    ${scope} ${panelSelectors} .euiSplitButton ${splitButtonActionSelectors} {
      border-radius: 0 !important;
    }

    ${scope} ${panelSelectors} .euiSplitButton .euiSplitButtonActionPrimary {
      border-start-start-radius: ${controlRadius} !important;
      border-end-start-radius: ${controlRadius} !important;
    }

    ${scope} ${panelSelectors} .euiSplitButton .euiSplitButtonActionSecondary {
      border-start-end-radius: ${controlRadius} !important;
      border-end-end-radius: ${controlRadius} !important;
    }

    /* Unified control groups: EuiButtonGroup + data grid toolbar control group */
    ${scopedInPanels(unifiedControlGroupWrapperSelectors)} {
      border: none !important;
      border-radius: ${controlRadius} !important;
      background-color: ${colors.backgroundBaseHighlighted} !important;
      overflow: hidden;
    }

    ${scopedInPanels(unifiedControlGroupPartSelectors)},
    ${scopedInPanels(unifiedControlGroupPartStateSelectors)},
    ${scopedInPanels(unifiedControlGroupPartChildSelectors)} {
      border: none !important;
      border-width: 0 !important;
      border-style: none !important;
      border-color: transparent !important;
      border-inline-width: 0 !important;
      border-block-width: 0 !important;
      border-radius: 0 !important;
      border-start-start-radius: 0 !important;
      border-start-end-radius: 0 !important;
      border-end-start-radius: 0 !important;
      border-end-end-radius: 0 !important;
      background: transparent !important;
      background-color: transparent !important;
      box-shadow: none !important;
      margin-inline-start: 0 !important;
    }

    ${scopedInPanels(unifiedControlGroupPartPseudoSelectors)} {
      display: none !important;
      content: none !important;
      border: none !important;
      background: none !important;
      background-color: transparent !important;
    }

    ${scopedInPanels(unifiedControlGroupSiblingSelectors)} {
      border-inline-start: none !important;
      border-left: none !important;
      border-right: none !important;
      border-inline-end: none !important;
    }

    ${scopedInPanels(unifiedControlGroupEmptyPseudoSelectors)} {
      border-radius: 0 !important;
      border-start-start-radius: 0 !important;
      border-start-end-radius: 0 !important;
      border-end-start-radius: 0 !important;
      border-end-end-radius: 0 !important;
    }

    /* Unified search filter group: square right edge when attached to the query input */
    ${scopedInPanels('.kbnFilterButtonGroup--attached')} {
      border-start-end-radius: 0 !important;
      border-end-end-radius: 0 !important;
    }

    ${scopedInPanels(buttonGroupHoverSelectors)} {
      color: ${colors.text} !important;
      background-color: ${components.buttons.backgroundTextHover} !important;
    }

    ${scope} ${panelSelectors} {
      color: ${colors.textSubdued};
    }

    ${scope} ${panelSelectors} ${subduedTextSelectors} {
      color: ${colors.textSubdued};
    }

    ${scope} ${panelSelectors} ${emphaticTextSelectors} {
      color: ${colors.text};
    }

    ${scope} .euiOverlayMask[data-relative-to-header='below'] {
      border-radius: ${containerRadius};
    }

    ${scope} .euiModal {
      border-radius: ${containerRadius} !important;
    }

    ${scope} .euiFlyout[class*='right']:not(
        [data-managed-flyout-layout-mode='side-by-side'][data-managed-flyout-level='child']
      ) {
      border-top-right-radius: ${containerRadius};
      border-bottom-right-radius: ${containerRadius};
    }

    body[${AGENT_WORKSPACE_ACTIVE_ATTR}='true']
      .kbnChromeLayoutAgent
      .euiOverlayMask[data-relative-to-header='below'] {
      border-radius: ${containerRadius};
    }

    ${scope} .euiBottomBar.euiBottomBar--fixed {
      border-bottom-left-radius: ${containerRadius} !important;
      border-bottom-right-radius: ${containerRadius} !important;
    }

    body[${AGENT_WORKSPACE_ACTIVE_ATTR}='true']
      .kbnChromeLayoutAgent
      .euiBottomBar.euiBottomBar--fixed {
      border-bottom-left-radius: ${containerRadius} !important;
      border-bottom-right-radius: ${containerRadius} !important;
    }
  `;
};

/**
 * Agent-first chrome POC styles — gated by rendering only when the agent workspace is shown.
 */
export const AgentFirstChromeGlobalStyles = () => {
  const euiTheme = useEuiTheme();

  useEffect(() => {
    document.body.setAttribute(AGENT_FIRST_BODY_ATTR, 'true');

    return () => {
      document.body.removeAttribute(AGENT_FIRST_BODY_ATTR);
    };
  }, []);

  return <Global styles={agentFirstChromeStyles(euiTheme)} />;
};
