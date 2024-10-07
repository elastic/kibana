/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { EuiThemeComputed } from '@elastic/eui';

export const tsvbEditorRowStyles = (theme: EuiThemeComputed) => css`
  background-color: ${theme.colors.lightestShade};
  padding: ${theme.size.s};
  margin-bottom: ${theme.size.s};
`;

export const aggRowChildrenStyles = (theme: EuiThemeComputed) => css`
  padding-top: calc(${theme.size.s} - 2px);
`;

export const titleStyles = (theme: EuiThemeComputed) => css`
  margin-top: -${theme.size.xs};
`;

export const aggRowSplitStyles = (theme: EuiThemeComputed) => css`
  padding-left: ${theme.size.xl};
`;
