/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css, type SerializedStyles } from '@emotion/react';
import { useMemo } from 'react';
import { useEuiFontSize, useEuiTheme } from '@elastic/eui';

/**
 * EUI's `EuiButton` only supports `s`/`m` (no plan to add `xs`).
 * We define `xs` sizing locally so `AiButton` can visually match `EuiButtonEmpty` `size="xs"`.
 * These values mirror the current EUI tokens for `EuiButtonEmpty` size `xs`.
 */

export const useAiButtonXsSizeCss = (): SerializedStyles => {
  const { euiTheme } = useEuiTheme();
  const { fontSize, lineHeight } = useEuiFontSize('xs');

  return useMemo(
    () => css`
      height: ${euiTheme.size.l};
      min-width: ${euiTheme.base * 6}px;
      padding: 0 ${euiTheme.size.s};
      border-radius: ${euiTheme.border.radius.small};
      font-size: ${fontSize};
      line-height: ${lineHeight};
    `,
    [euiTheme, fontSize, lineHeight]
  );
};
