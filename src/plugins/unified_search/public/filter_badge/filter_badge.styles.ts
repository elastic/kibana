/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { css } from '@emotion/css';
import { euiThemeVars } from '@kbn/ui-theme';
import type { EuiThemeComputed } from '@elastic/eui';

export const badgePaddingCss = (euiTheme: EuiThemeComputed) => css`
  padding: calc(${euiTheme.size.xs} + ${euiTheme.size.xxs});
`;

export const marginLeftLabelCss = (euiTheme: EuiThemeComputed) => css`
  margin-left: ${euiTheme.size.xs};
`;

export const bracketColorCss = css`
  color: ${euiThemeVars.euiColorPrimary};
`;

export const conditionSpacesCss = (euiTheme: EuiThemeComputed) => css`
  margin-inline: -${euiTheme.size.xs};
`;

export const conditionCss = css`
  ${bracketColorCss}
`;
