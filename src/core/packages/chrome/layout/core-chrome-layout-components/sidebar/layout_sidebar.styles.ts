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
  height: calc(100% - ${layoutVar('application.marginBottom')});
  width: calc(100% - ${layoutVar('application.marginRight')});
  z-index: ${layoutLevels.sidebar};
  min-height: 0; // to allow flex children to shrink properly
`;

export const styles = {
  root,
};
