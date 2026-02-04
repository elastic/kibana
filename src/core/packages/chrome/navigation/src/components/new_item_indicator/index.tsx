/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

interface NewItemIndicatorProps {
  isHighlighted: boolean;
}

/**
 * A visual indicator (dot) for new items.
 */
export const NewItemIndicator = ({ isHighlighted }: NewItemIndicatorProps) => {
  const { euiTheme } = useEuiTheme();

  const styles = css`
    position: absolute;
    top: 1px;
    right: 1px;
    pointer-events: none;
    stroke: ${isHighlighted
      ? euiTheme.components.buttons.backgroundPrimary
      : euiTheme.components.buttons.backgroundText};
    stroke-width: 2px;
    paint-order: stroke;
  `;
  return <EuiIcon css={styles} color="primary" type="dot" size="m" />;
};
