/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiShadow, transparentize, type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const getProposedChangesStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;

  const successBg = transparentize(euiTheme.colors.success, 0.12);
  const dangerBg = transparentize(euiTheme.colors.danger, 0.1);
  const dangerBgSubtle = transparentize(euiTheme.colors.danger, 0.06);

  return css`
    .wfDiffWrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
      box-sizing: border-box;
      position: relative;
    }

    .wfDiffContainer {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: ${dangerBgSubtle};
      margin-right: ${euiTheme.size.s};
      min-width: 0;
    }

    .wfDiffCodeContainer {
      padding: 0;
    }

    .wfDiffLine {
      display: flex;
      background-color: ${dangerBg};
      opacity: 0.7;
      overflow: hidden;
      box-sizing: border-box;
    }

    .wfDiffLineContent {
      flex: 1;
      padding: 0 ${euiTheme.size.s} 0 0;
      white-space: pre;
    }

    .wfDiffButtonsPill {
      display: flex;
      align-items: center;
      gap: 1px;
      padding: 1px;
      background: ${euiTheme.colors.backgroundBasePlain};
      border-radius: ${euiTheme.border.radius.small};
      ${euiShadow(euiThemeContext, 'm')}
      position: absolute;
      right: ${euiTheme.size.l};
      top: 0;
      z-index: ${euiTheme.levels.menu};
      pointer-events: auto;
    }

    .wfDiffNavSection {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 0 ${euiTheme.size.xs};
      border-right: 1px solid ${euiTheme.colors.borderBaseSubdued};
      margin-right: 1px;
    }

    .wfDiffNavBtn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${euiTheme.size.l};
      height: ${euiTheme.size.l};
      border-radius: ${euiTheme.border.radius.small};
      border: none;
      background: transparent;
      cursor: pointer;
      pointer-events: auto;
      color: ${euiTheme.colors.textSubdued};
      padding: 0;
      outline: none;
    }

    .wfDiffNavBtn:hover {
      background: ${euiTheme.colors.backgroundBaseInteractiveHover};
      color: ${euiTheme.colors.textParagraph};
    }

    .wfDiffNavBtn:active {
      background: ${euiTheme.colors.backgroundBaseInteractiveSelect};
    }

    .wfDiffNavCounter {
      font-family: ${euiTheme.font.family};
      font-size: ${euiTheme.size.m};
      font-weight: ${euiTheme.font.weight.medium};
      color: ${euiTheme.colors.textSubdued};
      white-space: nowrap;
      user-select: none;
      padding: 0 2px;
    }

    .wfDiffAcceptBtn,
    .wfDiffDeclineBtn {
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.s};
      height: ${euiTheme.size.xl};
      padding: 0 ${euiTheme.size.s};
      border-radius: ${euiTheme.border.radius.small};
      border: none;
      background: transparent;
      cursor: pointer;
      pointer-events: auto;
      font-family: ${euiTheme.font.family};
      font-weight: ${euiTheme.font.weight.medium};
      font-size: ${euiTheme.size.m};
      line-height: ${euiTheme.size.l};
      white-space: nowrap;
      outline: none;
    }

    .wfDiffAcceptBtn {
      color: ${euiTheme.colors.textSuccess};
    }

    .wfDiffAcceptBtn:hover {
      background: ${transparentize(euiTheme.colors.success, 0.15)};
    }

    .wfDiffAcceptBtn:active {
      background: ${transparentize(euiTheme.colors.success, 0.25)};
    }

    .wfDiffAcceptBtn svg {
      flex-shrink: 0;
    }

    .wfDiffAcceptBtn kbd {
      background: ${transparentize(euiTheme.colors.success, 0.15)};
      border: 1px solid ${transparentize(euiTheme.colors.success, 0.4)};
      padding: 3px ${euiTheme.size.xs};
      border-radius: ${euiTheme.border.radius.small};
      font-family: ${euiTheme.font.family};
      font-weight: ${euiTheme.font.weight.medium};
      font-size: 10px;
      color: ${euiTheme.colors.textSuccess};
      line-height: ${euiTheme.size.s};
    }

    .wfDiffDeclineBtn {
      color: ${euiTheme.colors.textDanger};
    }

    .wfDiffDeclineBtn:hover {
      background: ${transparentize(euiTheme.colors.danger, 0.15)};
    }

    .wfDiffDeclineBtn:active {
      background: ${transparentize(euiTheme.colors.danger, 0.25)};
    }

    .wfDiffDeclineBtn svg {
      flex-shrink: 0;
    }

    .wfDiffDeclineBtn kbd {
      background: ${transparentize(euiTheme.colors.danger, 0.15)};
      border: 1px solid ${transparentize(euiTheme.colors.danger, 0.4)};
      padding: 3px ${euiTheme.size.xs};
      border-radius: ${euiTheme.border.radius.small};
      font-family: ${euiTheme.font.family};
      font-weight: ${euiTheme.font.weight.medium};
      font-size: 10px;
      color: ${euiTheme.colors.textDanger};
      line-height: ${euiTheme.size.s};
    }

    .wfDiffLineAddBg {
      background-color: ${successBg} !important;
    }

    .wfDiffBulkBar {
      position: absolute;
      bottom: ${euiTheme.size.m};
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 1px;
      padding: 1px;
      background: ${euiTheme.colors.backgroundBasePlain};
      border-radius: ${euiTheme.border.radius.small};
      ${euiShadow(euiThemeContext, 'm')}
      z-index: ${Number(euiTheme.levels.menu) + 1};
      pointer-events: auto;
    }
  `;
};
