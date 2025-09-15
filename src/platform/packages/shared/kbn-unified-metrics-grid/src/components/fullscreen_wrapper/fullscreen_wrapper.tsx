/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFocusTrap, EuiOverlayMask, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

interface FullScreenProps {
  isFullscreen: boolean;
  dataTestSubj?: string;
}

export const FullScreenWrapper = ({
  isFullscreen,
  dataTestSubj,
  children,
}: React.PropsWithChildren<FullScreenProps>) => {
  const { euiTheme } = useEuiTheme();

  if (!isFullscreen) return <>{children}</>;

  return (
    <EuiOverlayMask headerZindexLocation="above">
      <EuiFocusTrap>
        <div
          css={css`position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: ${euiTheme.colors.backgroundBasePlain},
              display: 'flex',
              flex-direction: 'column',
              min-height: 0,
              z-index: ${euiTheme.levels.modal},
              overscroll-behavior: 'contain',
            `}
          data-test-subj={`${dataTestSubj}FullScreenWrapper`}
        >
          {children}
        </div>
      </EuiFocusTrap>
    </EuiOverlayMask>
  );
};
