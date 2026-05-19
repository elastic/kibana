/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText, type UseEuiTheme } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { css } from '@emotion/react';

export const ConditionalLabelWrapper = ({
  isPinned,
  label,
  children,
}: React.PropsWithChildren<{
  isPinned: boolean;
  label: string | undefined;
}>) => {
  const styles = useMemoCss(labelWrapperStyles);

  return isPinned ? (
    children
  ) : (
    <EuiFlexGroup direction="column" css={styles.flexGroup}>
      <EuiFlexItem css={styles.disableGrow}>
        <EuiText size="s" color="subdued" css={styles.label} component="p">
          {label}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

const labelWrapperStyles = {
  flexGroup: ({ euiTheme }: UseEuiTheme) =>
    css({
      gap: '1px',
      padding: `${euiTheme.size.xs} 0 1px 0`,
      overflow: 'hidden',
    }),
  disableGrow: css({ flexGrow: 0 }),
  label: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: `0 ${euiTheme.size.s}`,
      lineHeight: '1.2rem',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    }),
};
