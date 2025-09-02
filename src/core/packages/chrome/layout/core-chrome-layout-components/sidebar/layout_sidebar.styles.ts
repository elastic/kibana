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
  grid-area: sidebar;
  align-self: start;
  display: flex;
  gap: 12px;
  flex-direction: column;
  align-items: center;
  height: 100%;
  width: var(--kbn-layout--sidebar-width);
  z-index: var(--kbn-layout--aboveFlyoutLevel);
`;

export const styles = {
  root,
};
