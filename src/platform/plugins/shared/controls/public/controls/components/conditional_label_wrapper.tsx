/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';

export const ConditionalLabelWrapper = ({
  isPinned,
  label,
  children,
}: React.PropsWithChildren<{
  isPinned: boolean;
  label: string | undefined;
}>) => {
  return isPinned ? (
    children
  ) : (
    <EuiFlexGroup
      direction="column"
      css={css`
        gap: 2px;
        padding: 4px 8px 1px 8px;
      `}
    >
      <EuiFlexItem
        css={css`
          flex-grow: 0;
        `}
      >
        <EuiText
          size="s"
          color="subdued"
          css={css`
            line-height: 1rem;
          `}
          component="p"
        >
          {label}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
