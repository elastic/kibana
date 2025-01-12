/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';

export const expandedPanelLayoutStyles = css`
  height: 100%;
  position: relative;

  .kbnGridRowHeader {
    height: 0px; // used instead of 'display: none' due to a11y concerns
  }
  .kbnGridRowContainer {
    position: absolute;
    transform: translate(-9999px, -9999px);
    height: 100%;
    width: 100%;
  }
  .kbnGridRow {
    display: block !important; // overwrite grid display
  }
  .kbnGridPanel {
    visibility: hidden;
    position: absolute;
  }
`;

export const expandedPanelStyles = css`
  height: 100% !important;
  position: relative !important;
  visibility: visible !important;
  transform: translate(9999px, 9999px);
`;

export const expandedPanelGridHeightStyles = css`
  height: 100% !important;
  position: relative;
  transition: none;
  // switch to padding so that the panel does not extend the height of the parent
  margin: 0px;
  padding: calc(var(--kbnGridGutterSize) * 1px);
`;
