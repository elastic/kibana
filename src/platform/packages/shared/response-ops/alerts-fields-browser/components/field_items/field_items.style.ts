/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';

export const styles = {
  icon: css`
    margin: 0 4px;
    position: relative;
    top: -1px;
  `,
  truncatable: css`
    &,
    & * {
      display: inline-block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      vertical-align: top;
      white-space: nowrap;
    }
  `,
  description: css`
    user-select: text;
    width: 400px;
  `,
};
