/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// This file replaces scss core/public/_mixins.scss

import { css } from '@emotion/react';

// The `--kbnAppHeadersOffset` CSS variable is automatically updated by
// styles/rendering/_base.scss, based on whether the Kibana chrome has a
// header banner, app menu, and is visible or hidden
export const kibanaFullBodyHeightCss = (additionalOffset = 0) => css`
  height: calc(
    100vh - var(--kbnAppHeadersOffset, var(--euiFixedHeadersOffset, 0)) - ${additionalOffset}px
  );
`;
