/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonEmpty, EuiContextMenu } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';

export const countCss = css`
  font-size: ${euiThemeVars.euiFontSizeXS};
  font-weight: ${euiThemeVars.euiFontWeightSemiBold};
  border-right: ${euiThemeVars.euiBorderThin};
  margin-right: 16px;
  padding-right: 16px;
`;

export const statsContainerCss = css`
  font-size: ${euiThemeVars.euiFontSizeXS};
  font-weight: ${euiThemeVars.euiFontWeightSemiBold};
  .smallDot {
    width: 3px !important;
    display: inline-block;
  }
  .euiBadge__text {
    text-align: center;
    width: 100%;
  }
`;

export const groupingContainerCss = css`
  .groupingAccordionForm .euiAccordion__childWrapper .euiAccordion__children {
    margin-left: 8px;
    margin-right: 8px;
    border-left: ${euiThemeVars.euiBorderThin};
    border-right: ${euiThemeVars.euiBorderThin};
    border-bottom: ${euiThemeVars.euiBorderThin};
    border-radius: 0 0 6px 6px;
  }
  .groupingAccordionForm .euiAccordion__triggerWrapper {
    border-bottom: ${euiThemeVars.euiBorderThin};
    border-left: ${euiThemeVars.euiBorderThin};
    border-right: ${euiThemeVars.euiBorderThin};
    border-radius: 6px;
    min-height: 78px;
    padding-left: 16px;
    padding-right: 16px;
  }
  .groupingAccordionForm {
    border-top: ${euiThemeVars.euiBorderThin};
    border-bottom: none;
    border-radius: 6px;
    min-width: 1090px;
  }
  .groupingPanelRenderer {
    display: table;
    table-layout: fixed;
    width: 100%;
    padding-right: 32px;
  }
`;

export const groupingContainerCssLevel = css`
  .groupingAccordionFormLevel .euiAccordion__childWrapper .euiAccordion__children {
    margin-left: 8px;
    margin-right: 8px;
    border-left: none;
    border-right: none;
    border-bottom: ${euiThemeVars.euiBorderThin};
    border-radius: 0;
  }
  .groupingAccordionFormLevel .euiAccordion__triggerWrapper {
    border-bottom: ${euiThemeVars.euiBorderThin};
    border-left: none;
    border-right: none;
    min-height: 78px;
    padding-left: 16px;
    padding-right: 16px;
    border-radius: 0;
  }
  .groupingAccordionFormLevel {
    border-top: none;
    border-bottom: none;
    border-radius: 0;
    min-width: 1090px;
  }
  .groupingPanelRenderer {
    display: table;
    table-layout: fixed;
    width: 100%;
    padding-right: 32px;
  }
`;

export const StyledContextMenu = euiStyled(EuiContextMenu)`
  width: 250px;
  & .euiContextMenuItem__text {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .euiContextMenuItem {
    border-bottom: ${euiThemeVars.euiBorderThin};
  }
  .euiContextMenuItem:last-child {
    border: none;
  }
`;

export const StyledEuiButtonEmpty = euiStyled(EuiButtonEmpty)`
  font-weight: 'normal';

  .euiButtonEmpty__text {
    max-width: 300px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;
