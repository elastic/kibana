/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css, keyframes } from '@emotion/react';
import { euiCanAnimate, useEuiTheme } from '@elastic/eui';
import React from 'react';

// POC: productAgent blink from the motion reference. Hover only, and only while the sidenav item is not selected.
const agentBlink = keyframes`
  0% { transform: scaleY(1); animation-timing-function: var(--motion-agent-ease); }
  2.8125% { transform: scaleY(0); animation-timing-function: var(--motion-agent-ease); }
  5.625% { transform: scaleY(1); }
  6.875% { transform: scaleY(1); animation-timing-function: var(--motion-agent-ease); }
  9.6875% { transform: scaleY(0); animation-timing-function: var(--motion-agent-ease); }
  12.5% { transform: scaleY(1); }
  100% { transform: scaleY(1); }
`;

export const ProductAgentMotionIcon = () => {
  const { euiTheme } = useEuiTheme();

  return (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    viewBox="0 0 16 16"
    aria-hidden
    css={css`
      flex-shrink: 0;
      display: inline-block;
      vertical-align: middle;
      fill: currentColor;
      --motion-agent-ease: ${euiTheme.animation.resistance};

      .motionAgentEye {
        transform-box: fill-box;
        transform-origin: center;
      }

      ${euiCanAnimate} {
        [data-menu-item][data-highlighted='false']:hover & .motionAgentEye {
          animation: ${agentBlink} 3200ms linear infinite;
        }
      }
    `}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.389 1c.4 0 .783.116 1.078.328.294.212.533.55.533.972V3h1a3 3 0 0 1 3 3v1h1v3h-1v2a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3v-2H0V7h1V6a3 3 0 0 1 3-3h1v-.7c0-.423.239-.76.533-.972A1.85 1.85 0 0 1 6.611 1zM4 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm2-2v1h4V2z"
    />
    <rect className="motionAgentEye" x={5} y={7} width={1} height={3} />
    <rect className="motionAgentEye" x={10} y={7} width={1} height={3} />
  </svg>
  );
};
