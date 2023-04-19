/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { create, ThemeVars } from '@storybook/theming';
import { euiLightVars as vars } from '@kbn/ui-theme';

import { TITLE as brandTitle, URL as brandUrl } from './constants';

export const themeVars: ThemeVars = {
  base: 'light',
  brandTitle,
  brandUrl,
  colorPrimary: vars.euiColorPrimary,
  colorSecondary: vars.euiColorPrimary,
  appBg: vars.euiPageBackgroundColor,
  appContentBg: vars.euiColorEmptyShade,
  appBorderColor: vars.euiBorderColor,
  appBorderRadius: Number(vars.euiBorderRadius),
  fontBase: vars.euiFontFamily,
  fontCode: vars.euiCodeFontFamily,
  textColor: vars.euiTextColor,
  textInverseColor: vars.euiColorAccentText,
  barTextColor: vars.euiLinkColor,
  barSelectedColor: vars.euiColorAccentText,
  barBg: vars.euiColorLightestShade,
  inputBg: vars.euiFormBackgroundColor,
  inputBorder: vars.euiFormBorderColor,
  inputTextColor: vars.euiTextColor,
  inputBorderRadius: Number(vars.euiBorderRadius),
  textMutedColor: vars.euiTextSubduedColor,
};

export const theme = create(themeVars);
