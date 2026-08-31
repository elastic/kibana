/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { useBrandFill } from '../../../brand_icon';
import type { ConnectorIconProps } from '../../../types';

/*
 * The square mark Jina uses for their favicon — the dot plus the leading glyph —
 * rather than the full wordmark, which is 2.35:1 and collapses into a smudge at 16px.
 * Both shapes are verbatim from their `Jina-color.svg`; the viewBox is the union of
 * the two (67.1 x 63.5) padded to a square. On dark surfaces they both go white,
 * which is what their `Jina-white.svg` reversed asset does to the whole mark.
 */
export default (props: ConnectorIconProps) => {
  const dotFill = useBrandFill('#EB6161');
  const glyphFill = useBrandFill('#009191');

  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...props} viewBox="0 34.5 67.1 67.1">
      <circle fill={dotFill} cx="15.3" cy="84.5" r="15.3" />
      <path
        fill={glyphFill}
        d="M63.5 36.3c2 0 3.6 1.6 3.6 3.6l-.2 29.3c0 16.7-13.4 30.3-30.1 30.6h-.5V69.3 40c0-2 1.8-3.7 3.8-3.7h23.4z"
      />
    </svg>
  );
};
