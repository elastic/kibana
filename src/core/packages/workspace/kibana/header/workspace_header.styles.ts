/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { EmotionFn } from '../types';

const root: EmotionFn = ({ euiTheme }) => css`
  background: none;
  border: none;
  align-items: center;
  box-shadow: none;
  padding: 0 0 0 ${euiTheme.size.s};
`;

const section: EmotionFn = ({ euiTheme }) => css`
  margin: 0 ${euiTheme.size.s};
`;

export const styles = {
  root,
  section,
};
