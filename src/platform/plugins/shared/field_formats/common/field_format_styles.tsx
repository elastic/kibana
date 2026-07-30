/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { PropsWithChildren } from 'react';
import React from 'react';

const arrayHighlightStyles = ({ euiTheme }: ReturnType<typeof useEuiTheme>) =>
  css({
    color: euiTheme.colors.mediumShade,
  });

export const ArrayHighlight = ({ children }: PropsWithChildren) => {
  const euiTheme = useEuiTheme();

  return <span css={arrayHighlightStyles(euiTheme)}>{children}</span>;
};

export const searchHighlightStyles = css({
  textDecoration: 'dotted underline',
});

const emptyValueStyles = ({ euiTheme }: ReturnType<typeof useEuiTheme>) =>
  css({
    color: euiTheme.colors.darkShade,
  });

export const MissingValue = ({ children }: PropsWithChildren) => {
  const euiTheme = useEuiTheme();

  return <span css={emptyValueStyles(euiTheme)}>{children}</span>;
};
