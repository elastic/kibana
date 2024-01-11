/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiText } from '@elastic/eui';

const LINE_CLAMP = 2;

const styles = {
  truncatedText: css`
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: ${LINE_CLAMP};
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
  `,
};

const TruncatedTextComponent: React.FC<{ text: string }> = ({ text }) => (
  <EuiText size="xs" color="subdued" css={styles.truncatedText}>
    {text}
  </EuiText>
);

TruncatedTextComponent.displayName = 'TruncatedText';

export const TruncatedText = React.memo(TruncatedTextComponent);
