/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CSSInterpolation } from '@emotion/serialize';
import { aiIconTileCss } from './ai_icon_tile';
import type { IconVariant } from '../types';

/** Shared 40×40 category icon tile used in the actions list and preview rows. */
export const actionIconTileStyles = {
  tile: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: euiTheme.size.xxl,
      height: euiTheme.size.xxl,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: euiTheme.border.radius.medium,
      boxSizing: 'border-box',
    }),
  platform: aiIconTileCss,
  trigger: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseAccent,
      border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseAccent}`,
    }),
  appLogo: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
    }),
  command: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
    }),
  flowControl: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseAccentSecondary,
      border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseAccentSecondary}`,
    }),
  dataTransformation: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseWarning,
      border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseWarning}`,
    }),
  iconInner: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: euiTheme.size.base,
      height: euiTheme.size.base,
    }),
};

interface ActionIconTileVariantStyles {
  platform: CSSInterpolation;
  trigger: CSSInterpolation;
  appLogo: CSSInterpolation;
  flowControl: CSSInterpolation;
  dataTransformation: CSSInterpolation;
}

export function getActionIconTileVariantStyle(
  variant: IconVariant | undefined,
  styles: ActionIconTileVariantStyles
): CSSInterpolation {
  switch (variant) {
    case 'trigger':
      return styles.trigger;
    case 'external':
    case 'neutral':
      return styles.appLogo;
    case 'flowControl':
      return styles.flowControl;
    case 'dataTransformation':
      return styles.dataTransformation;
    case 'platform':
    case undefined:
      return styles.platform;
    default: {
      const exhaustiveCheck: never = variant;
      return exhaustiveCheck;
    }
  }
}
