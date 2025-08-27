/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiContextMenu } from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { css } from '@emotion/react';

export const groupingContainerCss = (euiTheme: EuiThemeComputed<{}>) => css`
  .groupingAccordionForm .euiAccordion__childWrapper .euiAccordion__children {
    margin-left: 8px;
    margin-right: 8px;
    border-left: ${euiTheme.border.thin};
    border-right: ${euiTheme.border.thin};
    border-bottom: ${euiTheme.border.thin};
    border-radius: 0 0 6px 6px;
  }
  .groupingAccordionForm .euiAccordion__triggerWrapper {
    border-bottom: ${euiTheme.border.thin};
    border-left: ${euiTheme.border.thin};
    border-right: ${euiTheme.border.thin};
    border-radius: 6px;
    min-height: 78px;
    padding-left: 16px;
    padding-right: 16px;
  }
  .groupingAccordionForm {
    border-top: ${euiTheme.border.thin};
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

export const groupingContainerCssLevel = (euiTheme: EuiThemeComputed<{}>) => css`
  .groupingAccordionFormLevel .euiAccordion__childWrapper .euiAccordion__children {
    margin-left: 8px;
    margin-right: 8px;
    border-left: none;
    border-right: none;
    border-bottom: ${euiTheme.border.thin};
    border-radius: 0;
  }
  .groupingAccordionFormLevel .euiAccordion__triggerWrapper {
    border-bottom: ${euiTheme.border.thin};
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

export const StyledContextMenu = euiStyled(EuiContextMenu)<{ border: EuiThemeComputed['border'] }>`
  width: 250px;
  & .euiContextMenuItem__text {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .euiContextMenuItem {
    border-bottom: ${(props) => props.border.thin};
  }
  .euiContextMenuItem:last-child {
    border: none;
  }
`;
