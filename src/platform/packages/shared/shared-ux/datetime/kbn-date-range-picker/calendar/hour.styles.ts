/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { useEuiFontSize, useEuiTheme } from '@elastic/eui';

export const useHourStyles = () => {
  const { euiTheme } = useEuiTheme();

  const baseButton = css`
    min-inline-size: 100%;
    min-height: ${euiTheme.size.l};
    ${useEuiFontSize('s')};
  `;

  const emptyButton = css`
    ${baseButton};
    color: ${euiTheme.colors.textParagraph};

    &:hover {
      color: ${euiTheme.colors.textPrimary};
    }
  `;

  const selectedButton = css`
    ${baseButton};
    color: ${euiTheme.colors.textInverse};
  `;

  return { baseButton, emptyButton, selectedButton };
};
