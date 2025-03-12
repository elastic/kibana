/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiThemeComputed } from '@elastic/eui';

const AMSTERDAM_HIGHLIGHT_COLOR = '#e5ffc0';
const AMSTERDAM_ACTIVE_HIGHLIGHT_COLOR = '#ffc30e';

export const getHighlightColors = (euiTheme: EuiThemeComputed<{}>) => {
  // FIXME: remove once Amsterdam theme is removed
  const isAmsterdamTheme = euiTheme.themeName.toLowerCase().includes('amsterdam');

  return {
    highlightColor: isAmsterdamTheme ? euiTheme.colors.plainDark : euiTheme.colors.textAccent,
    highlightBackgroundColor: isAmsterdamTheme
      ? AMSTERDAM_HIGHLIGHT_COLOR
      : euiTheme.colors.backgroundLightAccent,
    activeHighlightColor: isAmsterdamTheme
      ? euiTheme.colors.plainDark
      : euiTheme.colors.textInverse,
    activeHighlightBackgroundColor: isAmsterdamTheme
      ? AMSTERDAM_ACTIVE_HIGHLIGHT_COLOR
      : euiTheme.colors.backgroundFilledAccent,
    activeHighlightBorderColor: isAmsterdamTheme
      ? AMSTERDAM_ACTIVE_HIGHLIGHT_COLOR
      : euiTheme.colors.borderStrongAccent,
  };
};
