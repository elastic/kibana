/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiLoadingChart, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';

export const PresentationPanelLoadingIndicator = ({ showShadow }: { showShadow?: boolean }) => {
  return (
    <EuiPanel
      css={css`
        display: flex;
        justify-content: center;
        align-items: center;
      `}
      role="figure"
      paddingSize="none"
      hasShadow={showShadow}
      className={'presentationPanel'}
      data-test-subj="embeddablePanelLoadingIndicator"
    >
      <EuiLoadingChart size="l" mono />
    </EuiPanel>
  );
};
