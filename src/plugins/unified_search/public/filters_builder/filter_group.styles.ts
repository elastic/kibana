/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/css';

export const delimiterCss = ({
  padding,
  left,
  background,
}: {
  padding: string | null;
  left: string | null;
  background: string | null;
}) => css`
  position: relative;

  .filter-builder__delimiter_text {
    position: absolute;
    display: block;
    padding: 0 ${padding};
    top: 0;
    left: ${left};
    background: ${background};
  }
`;
