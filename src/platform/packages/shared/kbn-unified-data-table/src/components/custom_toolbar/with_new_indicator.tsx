/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';

interface WithNewIndicatorProps {
  children: React.ReactNode;
}

/**
 * Adds a new indicator (blue dot) to the given element.
 */
export const WithNewIndicator = ({ children }: WithNewIndicatorProps) => {
  return (
    <span css={{ position: 'relative', display: 'inline-flex' }}>
      {children}
      <EuiIcon
        type="dot"
        color="primary"
        css={{
          position: 'absolute',
          insetBlockStart: '-1px',
          insetInlineEnd: '-1px',
          pointerEvents: 'none',
        }}
        aria-hidden={true}
      />
    </span>
  );
};
