/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

/** Slides the recent-queries panel open and closed. */
export const HistoryPanelSlide = ({
  isOpen,
  children,
}: {
  isOpen: boolean;
  children: React.ReactNode;
}): JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const hasBeenOpenRef = useRef(isOpen);
  hasBeenOpenRef.current ||= isOpen;

  const transition = `${euiTheme.animation.normal} ${euiTheme.animation.resistance}`;

  return (
    <div
      data-test-subj="ESQLEditor-history-panel-slide"
      data-expanded={isOpen}
      css={css`
        display: grid;
        flex: 0 0 auto;
        width: 100%;
        grid-template-rows: ${isOpen ? '1fr' : '0fr'};
        visibility: ${isOpen ? 'visible' : 'hidden'};
        @media (prefers-reduced-motion: no-preference) {
          transition: grid-template-rows ${transition}, visibility ${transition};
        }
      `}
    >
      <div css={{ minBlockSize: 0, overflow: 'hidden' }}>{hasBeenOpenRef.current && children}</div>
    </div>
  );
};
