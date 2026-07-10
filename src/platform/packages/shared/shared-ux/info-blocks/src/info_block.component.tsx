/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FunctionComponent } from 'react';
import { css } from '@emotion/react';
import { EuiText, EuiTextTruncate, euiFontSize, useEuiTheme } from '@elastic/eui';
import type { InfoBlockItem } from './types';

export interface InfoBlockProps extends InfoBlockItem {
  compressed?: boolean;
}

/** Fixed-style title/value block used by {@link InfoBlocks}. */
export const InfoBlock: FunctionComponent<InfoBlockProps> = ({
  title,
  value,
  size,
  color,
  compressed,
  ...rest
}) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const valueFontSize =
    size && !compressed ? euiFontSize(euiThemeContext, size, { unit: 'px' }) : undefined;
  // Primitive values get built-in single-line truncation.
  const isTextValue = typeof value === 'string' || typeof value === 'number';
  return (
    <div
      data-test-subj={rest['data-test-subj'] ?? 'infoBlock'}
      css={css`
        min-width: 0;
      `}
    >
      <EuiText size="xs" color="subdued">
        <EuiTextTruncate text={title} />
      </EuiText>
      <EuiText
        size="s"
        color={color}
        css={css`
          font-weight: ${euiTheme.font.weight.bold};
          ${valueFontSize
            ? `
                font-size: ${valueFontSize.fontSize};
                line-height: ${valueFontSize.lineHeight};
                font-weight: ${euiTheme.font.weight.semiBold};
              `
            : ''}
          a {
            font-weight: inherit;
          }
        `}
      >
        {isTextValue ? <EuiTextTruncate text={String(value)} /> : value}
      </EuiText>
    </div>
  );
};
