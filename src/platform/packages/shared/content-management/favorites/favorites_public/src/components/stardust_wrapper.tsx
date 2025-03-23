/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { PropsWithChildren } from 'react';
import classNames from 'classnames';
import { euiCanAnimate, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

const buttonSize = 24; // 24px is the default size for EuiButtonIcon xs, TODO: calculate from theme?
const stardustRadius = 8;
const stardustSize = buttonSize + stardustRadius; // should be larger than the button size to nicely overlap
const stardustOffset = (stardustSize - buttonSize) / 2;

const stardustContainerStyles = css`
  @keyframes popping {
    0% {
      transform: scale(0, 0);
    }
    40% {
      transform: scale(0, 0);
    }
    75% {
      transform: scale(1.3, 1.3);
    }
    100% {
      transform: scale(1, 1);
    }
  }

  @keyframes sparkles-width {
    0% {
      stroke-width: 0;
    }
    15% {
      stroke-width: 8;
    }
    100% {
      stroke-width: 0;
    }
  }

  @keyframes sparkles-size {
    0% {
      transform: scale(0.2, 0.2);
    }
    5% {
      transform: scale(0.2, 0.2);
    }
    85% {
      transform: scale(2, 2);
    }
  }

  ${euiCanAnimate} {
    &.stardust-active {
      svg {
        animation: popping 0.5s 1;
      }

      .stardust {
        animation: sparkles-size 0.65s 1;

        circle {
          animation: sparkles-width 0.65s 1;
        }
      }
    }
  }

  .stardust {
    pointer-events: none;
    position: absolute;
    top: -${stardustOffset}px;
    left: -${stardustOffset}px;
  }

  circle {
    stroke-dashoffset: 8;
    stroke-dasharray: 1 9;
    stroke-width: 0;
  }
`;

/* Disable the animation on the button icon to not overcrowd the stardust effect */
const euiButtonIconStylesDisableAnimation = css`
  ${euiCanAnimate} {
    button.euiButtonIcon {
      &:active,
      &:hover,
      &:focus {
        animation: none;
        transform: none;
        background-color: transparent;
      }
    }
  }
`;

export const StardustWrapper = ({
  active,
  className,
  children,
}: PropsWithChildren<{ className?: string; active: boolean }>) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        display: inline-block;
        vertical-align: middle;
        position: relative;
        ${stardustContainerStyles}
        ${euiButtonIconStylesDisableAnimation}
      `}
      className={classNames(className, {
        'stardust-active': active,
      })}
    >
      {children}
      <svg height={stardustSize} width={stardustSize} className="stardust">
        <circle
          cx={stardustSize / 2}
          cy={stardustSize / 2}
          r={stardustRadius}
          stroke={euiTheme.colors.primary}
          fill="transparent"
        />
      </svg>
    </div>
  );
};
