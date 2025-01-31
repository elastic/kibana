/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { css } from '@emotion/react';

/**
 * Text wrapper to remove text-decoration from `EuiText`
 */
export const getAppendedTag = (label?: string) =>
  label && (
    <EuiText color="subdued" size="xs">
      <span
        css={css`
          display: inline-block;
        `}
      >
        {label}
      </span>
    </EuiText>
  );
