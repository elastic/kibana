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
import { EuiText, EuiTextTruncate, useEuiTheme } from '@elastic/eui';
import type { InfoBlockItem } from './types';

export interface InfoBlockProps extends InfoBlockItem {
  compressed?: boolean;
}

/**
 * A single info block: a fixed-style text title above an arbitrary node value.
 * Layout (columns, spacing) is owned by {@link InfoBlocks}.
 */
export const InfoBlock: FunctionComponent<InfoBlockProps> = ({
  title,
  value,
  size,
  color,
  compressed,
  ...rest
}) => {
  const { euiTheme } = useEuiTheme();
  // "Big number" values map their font size to the matching euiTheme.size token.
  // In the compressed layout the big number is suppressed so the value matches
  // the surrounding text.
  const bigNumberFontSize = size && !compressed ? euiTheme.size[size] : undefined;
  // Plain text values (and titles) truncate to a single line via
  // EuiTextTruncate so a long string never overflows its column. Node values
  // (badges, links, images) manage their own layout and render as-is.
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
          ${bigNumberFontSize
            ? `
                font-size: ${bigNumberFontSize};
                line-height: ${euiTheme.font.lineHeightMultiplier};
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
