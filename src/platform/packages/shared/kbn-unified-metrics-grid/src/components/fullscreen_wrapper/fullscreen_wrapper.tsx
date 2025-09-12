/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiFocusTrap, EuiOverlayMask, useEuiTheme } from '@elastic/eui';
import { getFullScreenStyles } from './get_fullscreen_styles';

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

  const styles = useMemo(() => getFullScreenStyles(euiTheme), [euiTheme]);

  if (!isFullscreen) return <>{children}</>;

  return (
    <EuiOverlayMask headerZindexLocation="above">
      <EuiFocusTrap>
        <div css={styles} data-test-subj={`${dataTestSubj}FullScreenWrapper`}>
          {children}
        </div>
      </EuiFocusTrap>
    </EuiOverlayMask>
  );
};
