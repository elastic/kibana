/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { type UseEuiTheme } from '@elastic/eui';

export const hourStyles = (euiThemeContext: UseEuiTheme, isSelected: boolean) => {
  const { euiTheme } = euiThemeContext;

  const button = css`
    display: block;
    width: 100%;
    padding: ${euiTheme.size.xs};
    border: none;
    background: ${isSelected ? euiTheme.colors.primary : 'transparent'};
    color: ${isSelected ? euiTheme.colors.ghost : euiTheme.colors.text};
    text-align: left;
    cursor: pointer;
    font-size: ${euiTheme.size.m};
    transition: background-color ${euiTheme.animation.fast} ease-in-out;

    &:hover {
      background: ${isSelected ? euiTheme.colors.primary : euiTheme.colors.lightestShade};
    }

    &:focus {
      outline: 2px solid ${euiTheme.colors.primary};
      outline-offset: -2px;
    }
  `;

  return { button };
};
