/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { layoutVar } from '@kbn/core-chrome-layout-constants';

import type { EmotionFn } from '../types';

const root: EmotionFn = ({ euiTheme }) =>
  css`
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    width: calc(${layoutVar('sidebar.width')} - ${euiTheme.size.s});
    margin-bottom: ${euiTheme.size.s};
    align-self: start;
    position: relative;

    .euiFlyoutFooter {
      border-bottom-right-radius: ${euiTheme.border.radius.small};
      border-bottom-left-radius: ${euiTheme.border.radius.small};
    }

    &::before {
      content: '';
      display: block;
      width: ${euiTheme.border.width.thin};
      background-color: ${euiTheme.colors.borderBaseSubdued};
      position: absolute;
      left: -${euiTheme.size.xs};
      top: ${euiTheme.size.m};
      height: ${euiTheme.size.l};
    }
  `;

const fullScreenRoot = css`
  width: 100%;

  &:before {
    left: 0;
  }
`;

const container = css`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
`;

const header: EmotionFn = ({ euiTheme }) => css`
  margin: ${euiTheme.size.s} 0 ${euiTheme.size.s} ${euiTheme.size.s};
  height: ${euiTheme.size.xl};
  align-items: center;
  flex-grow: 0;
`;

export const styles = {
  root,
  container,
  header,
  fullScreenRoot,
};
