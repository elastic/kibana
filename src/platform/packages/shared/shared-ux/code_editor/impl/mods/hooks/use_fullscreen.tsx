/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Fullscreen logic
 */

import React, { useMemo, useState, useCallback, type KeyboardEvent } from 'react';
import { css } from '@emotion/react';
import {
  type UseEuiTheme,
  useEuiTheme,
  EuiI18n,
  EuiButtonIcon,
  EuiOverlayMask,
  EuiFocusTrap,
  keys,
} from '@elastic/eui';

const getFullscreenStyles = (euiTheme: UseEuiTheme['euiTheme']) => {
  return {
    fullscreenContainer: css`
      position: absolute;
      left: 0;
      top: 0;
      background: ${euiTheme.colors.body};

      &
        .monaco-editor
        .margin:not(:has(.line-numbers))
        + .monaco-scrollable-element
        .monaco-mouse-cursor-text {
        padding: 0 ${euiTheme.size.base};
      }
    `,
  };
};

export const useFullScreen = ({ allowFullScreen }: { allowFullScreen?: boolean }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const { euiTheme } = useEuiTheme();

  const styles = useMemo(() => getFullscreenStyles(euiTheme), [euiTheme]);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (event.key === keys.ESCAPE) {
      event.preventDefault();
      event.stopPropagation();
      setIsFullScreen(false);
    }
  }, []);

  const FullScreenButton: React.FC = () => {
    if (!allowFullScreen) return null;
    return (
      <EuiI18n
        tokens={['euiCodeBlock.fullscreenCollapse', 'euiCodeBlock.fullscreenExpand']}
        defaults={['Collapse', 'Expand']}
      >
        {([fullscreenCollapse, fullscreenExpand]: string[]) => (
          <EuiButtonIcon
            onClick={toggleFullScreen}
            iconType={isFullScreen ? 'fullScreenExit' : 'fullScreen'}
            color="text"
            aria-label={isFullScreen ? fullscreenCollapse : fullscreenExpand}
            size="xs"
          />
        )}
      </EuiI18n>
    );
  };

  const FullScreenDisplay = useMemo(
    () =>
      ({ children }: { children: Array<JSX.Element | null> | JSX.Element }) => {
        if (!isFullScreen) return <>{children}</>;

        return (
          <EuiOverlayMask>
            <EuiFocusTrap clickOutsideDisables={true}>
              <div css={styles.fullscreenContainer}>{children}</div>
            </EuiFocusTrap>
          </EuiOverlayMask>
        );
      },
    [isFullScreen, styles]
  );

  return {
    FullScreenButton,
    FullScreenDisplay,
    onKeyDown,
    isFullScreen,
    setIsFullScreen,
  };
};
