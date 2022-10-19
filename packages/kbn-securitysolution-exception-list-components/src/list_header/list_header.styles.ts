/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';

export const headerCss = css`
  margin: ${euiThemeVars.euiSize};
`;

export const headerMenuCss = css`
  border-right: 1px solid #d3dae6;
  padding: ${euiThemeVars.euiSizeXS} ${euiThemeVars.euiSizeL} ${euiThemeVars.euiSizeXS} 0;
`;
export const textWithEditContainerCss = css`
  display: flex;
  width: fit-content;
  align-items: baseline;
  margin-bottom: ${euiThemeVars.euiSizeS};
  h1 {
    margin-bottom: 0;
  }
`;
export const textCss = css`
  font-size: ${euiThemeVars.euiFontSize};
  color: ${euiThemeVars.euiTextSubduedColor};
  margin-left: ${euiThemeVars.euiSizeXS};
`;
export const descriptionContainerCss = css`
  margin-top: -${euiThemeVars.euiSizeL};
  margin-bottom: -${euiThemeVars.euiSizeL};
`;
