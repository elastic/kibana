/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonIcon, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

interface SubmitButtonProps {
  tooltip: string;
  onClick: () => void;
  'data-test-subj'?: string;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  tooltip,
  onClick,
  'data-test-subj': dataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexItem
      grow={false}
      css={css`
        padding-left: ${euiTheme.size.xs};
        flex-shrink: 0;
      `}
    >
      <EuiToolTip position="top" content={tooltip} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="returnKey"
          display="fill"
          color="primary"
          size="s"
          aria-label={tooltip}
          onClick={onClick}
          data-test-subj={dataTestSubj}
        />
      </EuiToolTip>
    </EuiFlexItem>
  );
};
