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
    <EuiFlexGroup direction="column" css={styles.flexGroup}>
      <EuiFlexItem css={styles.disableGrow}>
        <EuiText size="s" color="subdued" css={styles.truncatedText} component="p">
          {label}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

const styles = {
  flexGroup: css({ gap: '1px', padding: '4px 8px 1px 8px', overflow: 'hidden' }),
  disableGrow: css({ flexGrow: 0 }),
  truncatedText: css({
    lineHeight: '1.2rem',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  }),
};
