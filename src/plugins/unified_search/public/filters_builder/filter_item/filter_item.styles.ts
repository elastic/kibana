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

export const fieldAndParamCss = css`
  min-width: 162px;
`;

export const operationCss = css`
  max-width: 162px;
`;

export const getGrabIconCss = (euiTheme: EuiThemeComputed) => css`
  margin: 0 ${euiTheme.size.xxs};
`;

export const actionButtonCss = css`
  &.euiButtonEmpty .euiButtonEmpty__content {
    padding: 0 4px;
  }
`;

export const disabledDraggableCss = css`
  &.euiDraggable .euiDraggable__item.euiDraggable__item--isDisabled {
    cursor: unset;
  }
`;
