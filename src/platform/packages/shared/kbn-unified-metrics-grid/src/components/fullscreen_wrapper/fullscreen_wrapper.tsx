/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiFocusTrap, EuiOverlayMask, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

interface FullScreenProps {
  isFullscreen: boolean;
  dataTestSubj?: string;
}

export const getFullScreenStyles = (euiTheme: EuiThemeComputed, isFullscreen: boolean) => {
  if (!isFullscreen) {
    return css`
      position: relative;
      width: 100%;
      height: 100%;
    `;
  }

  return css`
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: ${euiTheme.colors.body};
    z-index: ${euiTheme.levels.modal};
    overflow: auto;
  `;
};
export const FullScreenWrapper = ({
  isFullscreen,
  dataTestSubj,
  children,
}: React.PropsWithChildren<FullScreenProps>) => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(
    () => getFullScreenStyles(euiTheme, isFullscreen),
    [euiTheme, isFullscreen]
  );

  return (
    <EuiOverlayMask
      headerZindexLocation="above"
      css={isFullscreen ? undefined : { display: 'contents' }}
    >
      <EuiFocusTrap disabled={!isFullscreen}>
        <div css={styles} data-test-subj={`${dataTestSubj}FullScreenWrapper`}>
          {children}
        </div>
      </EuiFocusTrap>
    </EuiOverlayMask>
  );
};
