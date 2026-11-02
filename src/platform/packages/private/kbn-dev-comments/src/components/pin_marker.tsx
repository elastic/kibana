/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiIcon, useEuiTheme, type UseEuiTheme } from '@elastic/eui';
import { PIN_SIZE } from '../constants';

/** Teardrop shape of the pins; a resolved comment's has a wider, green border. */
export const pinShapeStyles = (
  euiTheme: UseEuiTheme['euiTheme'],
  { resolved = false }: { resolved?: boolean } = {}
) => css`
  width: ${PIN_SIZE}px;
  height: ${PIN_SIZE}px;
  border-radius: 50% 50% 50% 0;
  border: ${resolved
    ? `3px solid ${euiTheme.colors.success}`
    : `2px solid ${euiTheme.colors.emptyShade}`};
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
`;

/** Where the comment being written will be pinned. */
export const PinMarker = ({
  x,
  y,
  ...attributes
}: { x: number; y: number } & Record<string, unknown>) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        transform: translate(-50%, -100%);
        pointer-events: none;
      `}
      data-test-subj="devCommentsPendingPin"
      {...attributes}
    >
      <span
        css={[
          pinShapeStyles(euiTheme),
          css`
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: ${euiTheme.colors.primary};
          `,
        ]}
      >
        <EuiIcon type="plus" size="s" color="ghost" aria-hidden={true} />
      </span>
    </div>
  );
};
