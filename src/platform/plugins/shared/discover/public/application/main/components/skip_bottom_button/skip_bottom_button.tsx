/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiScreenReaderOnly, EuiButton, type UseEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

export interface SkipBottomButtonProps {
  /**
   * Action to perform on click
   */
  onClick: () => void;
}

export function SkipBottomButton({ onClick }: SkipBottomButtonProps) {
  return (
    <EuiScreenReaderOnly showOnFocus>
      <EuiButton
        css={skipBottomButtonCss}
        fill
        size="s"
        onClick={onClick}
        data-test-subj="discoverSkipTableButton"
      >
        <FormattedMessage
          id="discover.skipToBottomButtonLabel"
          defaultMessage="Go to end of table"
        />
      </EuiButton>
    </EuiScreenReaderOnly>
  );
}

const skipBottomButtonCss = ({ euiTheme }: UseEuiTheme) => css`
  z-index: ${euiTheme.levels.header};
  transition: none !important;

  &:focus {
    animation: none !important;
    position: absolute;
  }
`;
