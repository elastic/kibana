/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/react';

// Values taken from @elastic/eui/src/components/image
export const sizes = {
  s: css`
    width: 100px;
  `,
  m: css`
    width: 200px;
  `,
  l: css`
    width: 360px;
  `,
  xl: css`
    width: 600px;
  `,
  original: css`
    width: auto;
  `,
  fullWidth: css`
    width: 100%;
  `,
};
