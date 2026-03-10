/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';

export const getProposedChangesStyles = () => css`
  .wfDiffWrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    box-sizing: border-box;
    position: relative;
  }

  /* View zone container — shows original (deleted) content */
  .wfDiffContainer {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: rgba(238, 76, 72, 0.06);
    border-left: 3px solid #ee4c48;
    margin-right: 8px;
    min-width: 0;
  }

  .wfDiffCodeContainer {
    padding: 0;
  }

  .wfDiffLine {
    display: flex;
    background-color: rgba(238, 76, 72, 0.1);
    opacity: 0.7;
  }

  .wfDiffLineContent {
    flex: 1;
    padding: 0 12px 0 0;
    white-space: pre;
  }

  /* Floating accept/decline pill */
  .wfDiffButtonsPill {
    display: flex;
    align-items: center;
    gap: 1px;
    padding: 1px;
    background: white;
    border-radius: 4px;
    box-shadow: 0px 0px 2px 0px rgba(43, 57, 79, 0.16), 0px 5px 16px 0px rgba(43, 57, 79, 0.14),
      0px 10px 20px 0px rgba(43, 57, 79, 0.08);
    position: absolute;
    right: 24px;
    top: 0;
    z-index: 10;
    pointer-events: auto;
  }

  .wfDiffAcceptBtn,
  .wfDiffDeclineBtn {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 32px;
    padding: 0 8px;
    border-radius: 4px;
    border: none;
    background: transparent;
    cursor: pointer;
    pointer-events: auto;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    font-size: 14px;
    line-height: 20px;
    white-space: nowrap;
    outline: none;
  }

  .wfDiffAcceptBtn {
    color: #09724d;
  }

  .wfDiffAcceptBtn:hover {
    background: rgba(174, 232, 210, 0.2);
  }

  .wfDiffAcceptBtn:active {
    background: rgba(174, 232, 210, 0.35);
  }

  .wfDiffAcceptBtn svg {
    flex-shrink: 0;
  }

  .wfDiffAcceptBtn kbd {
    background: rgba(174, 232, 210, 0.2);
    border: 1px solid #aee8d2;
    padding: 3px 6px;
    border-radius: 3px;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    font-size: 10px;
    color: #09724d;
    line-height: 10px;
  }

  .wfDiffDeclineBtn {
    color: #a71627;
  }

  .wfDiffDeclineBtn:hover {
    background: rgba(255, 199, 219, 0.2);
  }

  .wfDiffDeclineBtn:active {
    background: rgba(255, 199, 219, 0.35);
  }

  .wfDiffDeclineBtn svg {
    flex-shrink: 0;
  }

  .wfDiffDeclineBtn kbd {
    background: rgba(255, 199, 219, 0.2);
    border: 1px solid #ffc7db;
    padding: 3px 6px;
    border-radius: 3px;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    font-size: 10px;
    color: #a71627;
    line-height: 10px;
  }

  /* Glyph margin indicators */
  .wfDiffGlyphAdd {
    background-color: #24c292 !important;
    width: 4px !important;
    margin-left: 2px !important;
    border-radius: 2px !important;
  }

  .wfDiffGlyphDelete {
    background-color: #ee4c48 !important;
    width: 4px !important;
    margin-left: 2px !important;
    border-radius: 2px !important;
  }

  /* New lines added to the model by a proposal */
  .wfDiffLineAddBg {
    background-color: rgba(36, 194, 146, 0.12) !important;
  }
`;
