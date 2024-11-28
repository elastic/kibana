/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiThemeVars } from '@kbn/ui-theme';
import { GridAccessMode } from '../types';

const getViewportWidth = () =>
  window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;

export const shouldShowMobileView = (accessMode: GridAccessMode) =>
  accessMode === 'VIEW' && getViewportWidth() < parseFloat(euiThemeVars.euiBreakpoints.m);
