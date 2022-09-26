/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css, cx } from '@emotion/css';
import { euiThemeVars } from '@kbn/ui-theme';

// TODO check font Roboto Mono
export const nestedGroupSpaceCss = css`
  margin-left: ${euiThemeVars.euiSizeXL};
  margin-bottom: ${euiThemeVars.euiSizeXS};
  padding-top: ${euiThemeVars.euiSizeXS};
`;

export const borderCss = css`
  border: 1px;
  border-color: #d3dae6;
  border-style: solid;
`;

export const valueContainerCss = cx(`
  display: flex;
  align-items: center;
  margin-left: ${euiThemeVars.euiSizeS};
`);
export const expressionContainerCss = cx(`
  display: flex;
  align-items: center;
`);
