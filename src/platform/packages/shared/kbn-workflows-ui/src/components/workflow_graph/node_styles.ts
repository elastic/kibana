/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiCanAnimate } from '@elastic/eui';
import type { useEuiTheme } from '@elastic/eui';

type EuiTheme = ReturnType<typeof useEuiTheme>['euiTheme'];

/** Outer step/trigger card corner radius. */
export const NODE_BORDER_RADIUS = 8;
/** Icon tile corner radius inside the card. */
export const CHIP_BORDER_RADIUS = 4;
export const CHIP_SIZE = 32;

/**
 * Selection ring on the card's `::after` — sits outside so it does not fight
 * the drop shadow or inflate the layout box.
 */
export const selectionRingStyle = (euiTheme: EuiTheme, isActive: boolean) =>
  ({
    content: '""',
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    pointerEvents: 'none',
    boxShadow: isActive ? `0 0 0 2px ${euiTheme.colors.primary}` : 'none',
    [euiCanAnimate]: { transition: 'box-shadow 120ms ease' },
  } as const);

/** Card title typography shared by step, pending, group and settings nodes. */
export const nodeLabelTypography = (euiTheme: EuiTheme, lineHeight: string) => ({
  fontFamily: euiTheme.font.family,
  fontSize: 12,
  fontWeight: 500,
  lineHeight,
});
