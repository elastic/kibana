/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';

/** Tweakpane lower bound for dashboard content max width. */
export const DASHBOARD_MAX_WIDTH_MIN_PX = 800;
/** Tweakpane upper bound for dashboard content max width. */
export const DASHBOARD_MAX_WIDTH_MAX_PX = 5000;
/** Default max width (effectively full width on typical viewports). */
export const DASHBOARD_DEFAULT_MAX_WIDTH_PX = DASHBOARD_MAX_WIDTH_MAX_PX;

export const clampDashboardMaxWidthPx = (value: number): number =>
  Math.min(DASHBOARD_MAX_WIDTH_MAX_PX, Math.max(DASHBOARD_MAX_WIDTH_MIN_PX, value));

/** Emotion-friendly max-width constraint for dashboard content columns. */
export const getDashboardLayoutMaxWidthStyleObject = (maxWidthPx: number) => ({
  boxSizing: 'border-box' as const,
  width: '100%',
  maxWidth: `${maxWidthPx}px`,
  marginLeft: 'auto' as const,
  marginRight: 'auto' as const,
});

/** Centers dashboard chrome and constrains it to the Tweakpane max-width value. */
export const dashboardLayoutMaxWidthStyles = (maxWidthPx: number) =>
  css(getDashboardLayoutMaxWidthStyleObject(maxWidthPx));
