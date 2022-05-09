/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect } from 'react';
import { useEuiTheme, keys } from '@elastic/eui';
import { css } from '@emotion/react';
import useMountedState from 'react-use/lib/useMountedState';

import { ExitFullScreenButton as Component } from './exit_full_screen_button.component';
import { useServices } from './services';

/**
 * Props for the service-enabled `ExitFullScreenButton` component.
 */
export interface Props {
  /** Optional handler to call when one exits full-screen mode. */
  onExit?: () => void;
  /** Should the button toggle the Chrome visibility? */
  toggleChrome?: boolean;
}

/**
 * A service-enabled component that provides Kibana-specific functionality to the `ExitFullScreenButton`
 * pure component.
 */
export const ExitFullScreenButton = ({ onExit = () => {}, toggleChrome = true }: Props) => {
  const { euiTheme } = useEuiTheme();
  const { setIsFullscreen } = useServices();
  const isMounted = useMountedState();

  const onClick = useCallback(() => {
    if (toggleChrome) {
      setIsFullscreen(true);
    }
    onExit();
  }, [onExit, setIsFullscreen, toggleChrome]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === keys.ESCAPE) {
        onClick();
      }
    },
    [onClick]
  );

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown, false);

    if (toggleChrome) {
      setIsFullscreen(false);
    }

    // cleanup the listener
    return () => {
      document.removeEventListener('keydown', onKeyDown, false);
    };
  }, [onKeyDown, toggleChrome, setIsFullscreen]);

  useEffect(() => {
    if (!isMounted() && toggleChrome) {
      setIsFullscreen(true);
    }
  }, [isMounted, setIsFullscreen, toggleChrome]);

  // override the z-index: 1 applied to all non-eui elements that are in :focus via kui
  // see packages/kbn-ui-framework/src/global_styling/reset/_reset.scss
  const buttonCSS = css`
    bottom: ${euiTheme.size.s};
    left: ${euiTheme.size.s};
    position: fixed;
    z-index: 5;
  `;

  return <Component css={buttonCSS} {...{ onClick }} />;
};
