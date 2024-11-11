/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ThemeMode } from '../../types';
import { changeAlpha, combineColors } from '../../utils/color_math';

export const getBackgroundColor2 = (mode: ThemeMode, fgColor: string) => {
  return combineColors(changeAlpha(fgColor, 0.3), mode !== 'LIGHT' ? 'black' : 'white');
};

export const getBackgroundColor = (mode: ThemeMode) =>
  mode === 'LIGHT' ? '#F6F9FC' : mode === 'DARK' ? '#0E0F12' : '#07101F';
