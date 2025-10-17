/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { logicalCSS } from '@elastic/eui';
import type { EmotionFn } from '../types';

const root: EmotionFn = ({ euiTheme }) => css`
  align-items: center;
  background-color: transparent;
  border-width: 0;
  box-shadow: none;
  gap: ${euiTheme.size.xs};
  height: ${euiTheme.size.xl};
  margin: ${euiTheme.size.s} 0;
`;

const logoSection: EmotionFn = ({ euiTheme }) => css`
  align-items: center;
  display: flex;
  height: ${euiTheme.size.xl};
  justify-content: center;
  width: ${euiTheme.size.xl};
  position: relative;

  &::before {
    background-color: ${euiTheme.colors.borderBaseSubdued};
    content: '';
    left: -${euiTheme.size.s};
    position: absolute;
    height: ${euiTheme.size.l};
    width: ${euiTheme.border.width.thin};
  }
`;

const breadcrumbsSection: EmotionFn = ({ euiTheme }) => css`
  align-items: center;
  display: flex;
  height: ${euiTheme.size.xl};
  justify-content: center;
}`;

const spaceSection: EmotionFn = ({ euiTheme }) => css`
  align-items: center;
  display: flex;
  height: ${euiTheme.size.xl};
  justify-content: flex-start;
  position: relative;
  position: relative;
  width: ${euiTheme.size.xxxl};

  .euiButtonEmpty {
    min-inline-size: ${euiTheme.size.xl};
    block-size: ${euiTheme.size.xl};
    padding-inline: 0;
  }

  &::after {
    content: '';
    flex-shrink: 0;
    position: absolute;
    right: ${euiTheme.size.xs};
    ${logicalCSS('margin-top', euiTheme.size.xs)}
    ${logicalCSS('margin-bottom', 0)}
    ${logicalCSS('margin-left', euiTheme.size.m)}
    ${logicalCSS('margin-right', euiTheme.size.xs)}
    ${logicalCSS('height', euiTheme.size.base)}
    ${logicalCSS('border-right-width', euiTheme.border.width.thin)}
    ${logicalCSS('border-right-style', 'solid')}
    ${logicalCSS('border-right-color', euiTheme.colors.borderBaseSubdued)}
    transform: translateY(-${euiTheme.border.width.thin}) rotate(15deg);
  }
`;

const spaceAvatar: EmotionFn = ({ euiTheme }) => css`
  margin: 0 ${euiTheme.size.xs};
`;

const rightSection: EmotionFn = ({ euiTheme }) => css`
  margin-right: ${euiTheme.size.s};
`;

export const styles = {
  root,
  spaceAvatar,
  breadcrumbsSection,
  logoSection,
  spaceSection,
  rightSection,
};
