/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/css';

import add from '../assets/add.svg';
import or from '../assets/or.svg';

export const cursorAddCss = css`
  cursor: url(${add}), auto;
`;

export const cursorOrCss = css`
  cursor: url(${or}), auto;
`;

export const fieldAndParamCss = (euiTheme: EuiThemeComputed) => css`
  min-width: calc(${euiTheme.size.xl} * 5);
  flex-grow: 1;
  .euiFormRow {
    max-width: 800px;
  }
`;

export const operationCss = (euiTheme: EuiThemeComputed) => css`
  max-width: calc(${euiTheme.size.xl} * 4.5);
  // temporary fix to be removed after https://github.com/elastic/eui/issues/2082 is fixed
  .euiComboBox__inputWrap {
    padding-right: calc(${euiTheme.size.base}) !important;
  }
`;

export const getGrabIconCss = (euiTheme: EuiThemeComputed) => css`
  margin: 0 ${euiTheme.size.xxs};
`;

export const actionButtonCss = (euiTheme: EuiThemeComputed) => css`
  padding-inline: ${euiTheme.size.xs};
`;

export const disabledDraggableCss = css`
  &.euiDraggable .euiDraggable__item.euiDraggable__item--isDisabled {
    cursor: unset;
  }
`;
