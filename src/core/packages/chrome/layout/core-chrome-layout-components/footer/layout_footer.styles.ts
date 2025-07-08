/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';

const root = css`
  position: sticky;
  grid-area: footer;
  width: var(--kbn-layout--footer-width);
  height: var(--kbn-layout--footer-height);
  z-index: var(--kbn-layout--aboveFlyoutLevel);
`;

export const styles = {
  root,
};
