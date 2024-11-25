/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';

export const headerMenuCss = css`
  border-right: 1px solid #d3dae6;
  padding: ${euiThemeVars.euiSizeXS} ${euiThemeVars.euiSizeL} ${euiThemeVars.euiSizeXS} 0;
`;

export const noLinkedRulesCss = css`
  width: max-content;
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

export const backTextCss = css`
  font-size: ${euiThemeVars.euiFontSizeXS};
`;
