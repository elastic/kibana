/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { layoutVar, layoutLevels } from '@kbn/core-chrome-layout-constants';

const root = css`
  grid-area: sidebar;
  display: flex;
  flex-direction: column;
  height: calc(
    100% - ${layoutVar('application.marginTop')} - ${layoutVar('application.marginBottom')}
  );
  width: calc(100% - ${layoutVar('application.marginRight')});
  z-index: ${layoutLevels.sidebar};
  min-height: 0; // to allow flex children to shrink properly
`;

// When the sidebar is on the left, drop its z-index below EUI flyouts (1000) so that
// the global nav (EuiCollapsibleNav, z-index ~1000) slides over it correctly.
// The high z-index is only needed on the right to prevent app-level flyouts from
// covering the chat panel.
const rootLeft = css`
  z-index: ${layoutLevels.navigation};
`;

export const styles = {
  root,
  rootLeft,
};
