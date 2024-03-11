/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiLoadingChart, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const PanelLoader = (props: { showShadow?: boolean; dataTestSubj?: string }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      css={css`
        z-index: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: $euiSizeL + 2px;
        position: relative;
        justify-content: center;
        align-items: center;
        outline: ${euiTheme.border.thin};
      `}
      role="figure"
      paddingSize="none"
      hasShadow={false}
      data-test-subj={props.dataTestSubj}
    >
      <EuiLoadingChart size="l" mono />
    </EuiPanel>
  );
};
