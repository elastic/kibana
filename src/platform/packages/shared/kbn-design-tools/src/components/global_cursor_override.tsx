/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css, Global } from '@emotion/react';

interface Props {
  cursor: string;
  allowButtons?: boolean;
  ignoredElementsCursor?: string;
}

/**
 * Renders a Global style that forces `cursor` on all elements.
 * `ignoredElementsCursor`, when set, resets the cursor for devtool-ignore
 * elements (e.g. a pinned panel).
 */
export const GlobalCursorOverride = ({ cursor, allowButtons, ignoredElementsCursor }: Props) => (
  <Global
    styles={css({
      'body *': {
        cursor: `${cursor} !important`,
      },
      ...(ignoredElementsCursor && {
        '[data-devtool-ignore], [data-devtool-ignore] *': {
          cursor: `${ignoredElementsCursor} !important`,
        },
      }),
      ...(allowButtons && {
        '[data-devtool-ignore] button, [data-devtool-ignore] [role="button"]': {
          cursor: 'pointer !important',
        },
      }),
    })}
  />
);
