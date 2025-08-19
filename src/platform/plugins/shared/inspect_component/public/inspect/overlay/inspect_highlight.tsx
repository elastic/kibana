/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CSSProperties } from 'react';
import { transparentize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

interface Props {
  currentPosition: CSSProperties;
}

export const InspectHighlight = ({ currentPosition }: Props) => {
  const { euiTheme } = useEuiTheme();

  const highlightCss = css({
    position: 'absolute',
    backgroundColor: transparentize(euiTheme.colors.primary, 0.3),
    border: `2px solid ${euiTheme.colors.primary}`,
    pointerEvents: 'none',
    ...currentPosition,
  });

  return <div className={highlightCss} />;
};
