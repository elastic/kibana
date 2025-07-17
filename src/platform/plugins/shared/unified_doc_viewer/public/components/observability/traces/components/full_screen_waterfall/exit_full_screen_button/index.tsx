/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiWindowEvent } from '@elastic/eui';
export interface ExitFullScreenButtonProps {
  ariaLabel: string;
  dataTestSubj: string;
  onExitFullScreen: () => void;
}

export const ExitFullScreenButton = ({
  ariaLabel,
  dataTestSubj,
  onExitFullScreen,
}: ExitFullScreenButtonProps) => {
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();

        onExitFullScreen();
      }
    },
    [onExitFullScreen]
  );
  return (
    <>
      <EuiWindowEvent event="keydown" handler={onKeyDown} />
      <EuiButtonIcon
        data-test-subj={dataTestSubj}
        display="base"
        iconSize="m"
        iconType="fullScreenExit"
        aria-label={ariaLabel}
        onClick={onExitFullScreen}
      />
    </>
  );
};
