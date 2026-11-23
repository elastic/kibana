/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import type { CSSObject } from '@emotion/react';

export const arrayHighlightStyles = ({ euiTheme }: Partial<UseEuiTheme>): CSSObject => ({
  color: euiTheme?.colors.mediumShade ?? 'inherit',
});

export const searchHighlightStyles: CSSObject = {
  textDecoration: 'dotted underline',
};

export const emptyValueStyles = ({ euiTheme }: Partial<UseEuiTheme>): CSSObject => ({
  color: euiTheme?.colors.darkShade ?? 'inherit',
});
