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
import { EuiText, useEuiTheme } from '@elastic/eui';
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
  compressed,
  ...rest
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      data-test-subj={rest['data-test-subj'] ?? 'infoBlock'}
      css={css`
        min-width: 0;
      `}
    >
      <EuiText size="xs" color="subdued">
        {title}
      </EuiText>
      <EuiText
        size={compressed ? 'xs' : 's'}
        css={css`
          font-weight: ${euiTheme.font.weight.bold};
          a {
            font-weight: inherit;
          }
        `}
      >
        {value}
      </EuiText>
    </div>
  );
};
