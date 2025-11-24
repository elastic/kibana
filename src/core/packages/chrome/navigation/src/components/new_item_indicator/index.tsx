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

/**
 * A visual indicator (dot) for new items.
 */
export const NewItemIndicator = () => {
  const { euiTheme } = useEuiTheme();

  const dotSize = euiTheme.size.base;

  const styles = css`
    position: absolute;
    top: calc(${dotSize} * -0.2);
    right: calc(${dotSize} * -0.2);
    stroke: ${euiTheme.colors.backgroundBasePrimary};
    pointer-events: none;
  `;
  return <EuiIcon css={styles} color="primary" type="dot" size="m" />;
};
