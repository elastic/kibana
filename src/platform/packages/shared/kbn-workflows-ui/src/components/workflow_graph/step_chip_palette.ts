/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { useEuiTheme } from '@elastic/eui';
import type { StepFamily } from '../step_icons';

type EuiTheme = ReturnType<typeof useEuiTheme>['euiTheme'];

/** Outcome for chip colour resolution — `'none'` means running or idle (no status). */
export type ChipOutcome = 'none' | 'success' | 'failure';

export interface ChipPalette {
  /** Background fill of the chip box. */
  readonly fill: string;
  /** Border colour of the chip box. */
  readonly border: string;
  /** Tint applied to a monochrome (mask-based) icon. */
  readonly icon: string;
}

/**
 * Token-driven colour palette for the step icon chip, transcribed from the
 * canonical token table (visual-builder-canvas-eui-tokens.md §Icon tile).
 *
 * Outcome overrides apply to every family including `brand`, matching the doc:
 * "On run outcome, every chip — including brand chips — switches to…"
 *
 * Whether to force-fill a rich-colour logo (SVG/React component) is a separate
 * concern left to the caller: it is true only when outcome ≠ 'none', since the
 * `color` prop alone cannot recolour multi-colour logos at runtime.
 */
export const getStepChipPalette = (
  euiTheme: EuiTheme,
  family: StepFamily,
  outcome: ChipOutcome
): ChipPalette => {
  const { colors } = euiTheme;

  if (outcome === 'success') {
    return {
      fill: colors.backgroundBaseSuccess,
      border: colors.success,
      icon: colors.success,
    };
  }

  if (outcome === 'failure') {
    return {
      fill: colors.backgroundBaseDanger,
      border: colors.danger,
      icon: colors.danger,
    };
  }

  // Idle / running — family-specific colours.
  switch (family) {
    case 'trigger':
      return {
        fill: colors.backgroundBaseAccent,
        border: colors.borderBaseAccent,
        icon: colors.textAccent,
      };
    case 'flow':
      return {
        fill: colors.backgroundBaseAccentSecondary,
        border: colors.borderBaseAccentSecondary,
        icon: colors.textAccentSecondary,
      };
    case 'data':
      return {
        fill: colors.backgroundBaseWarning,
        border: colors.borderBaseWarning,
        icon: colors.textWarning,
      };
    case 'code':
      return {
        fill: colors.backgroundBasePrimary,
        border: colors.borderBasePrimary,
        icon: colors.textPrimary,
      };
    case 'brand':
    case 'external':
    default:
      return {
        fill: colors.backgroundBaseSubdued,
        border: colors.borderBaseSubdued,
        icon: colors.textSubdued,
      };
  }
};
