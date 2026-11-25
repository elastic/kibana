/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiText } from '@elastic/eui';

export const OptionsListPopoverSuggestionBadge = ({ documentCount }: { documentCount: number }) => {
  return (
    <EuiText
      size="xs"
      aria-hidden={true}
      className="eui-textNumber"
      data-test-subj="optionsList-document-count-badge"
      css={styles.documentCountBadge}
    >
      {`${documentCount.toLocaleString()}`}
    </EuiText>
  );
};

const styles = {
  documentCountBadge: ({ euiTheme }: UseEuiTheme) => css`
    font-weight: ${euiTheme.font.weight.medium} !important;
    color: ${euiTheme.colors.textSubdued} !important;
  `,
};
