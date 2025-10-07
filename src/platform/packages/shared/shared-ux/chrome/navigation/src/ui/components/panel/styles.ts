/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Theme } from '@emotion/react';
import { css } from '@emotion/react';

const PANEL_WIDTH = '248px';

export const panelWrapperStyles = css`
  clip-path: polygon(
    0 0,
    150% 0,
    150% 100%,
    0 100%
  ); /* Clip the left side to avoid leaking the shadow on that side */
  height: 100%;
  left: calc(100% + 1px); /* Add 1 px so we see the right border */
  position: absolute;
  top: 0;
`;

export const navPanelStyles = ({ euiTheme }: Theme) => css`
  background-color: ${euiTheme.colors.backgroundBaseSubdued};
  height: 100%;
  width: ${PANEL_WIDTH};
  /* unset default panel floating border */
  border: none;
  /* add custom floating border */
  border-inline-end: 1px solid ${euiTheme.colors.borderBaseFloating};
`;
