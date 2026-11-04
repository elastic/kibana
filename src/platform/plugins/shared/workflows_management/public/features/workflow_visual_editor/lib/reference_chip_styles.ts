/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';

/** Chips stay neutral; only "needs attention" turns amber. */
export type ReferenceChipTone = 'neutral' | 'warning';

/** Colours of a chip box, shared by the React chip and the pills drawn inside Monaco. */
export const getReferenceChipColors = (
  euiTheme: UseEuiTheme['euiTheme'],
  tone: ReferenceChipTone
) =>
  tone === 'warning'
    ? {
        background: euiTheme.colors.backgroundBaseWarning,
        border: euiTheme.colors.borderBaseWarning,
        text: euiTheme.colors.textWarning,
      }
    : {
        background: euiTheme.colors.backgroundBaseNeutral,
        border: euiTheme.colors.borderBaseNeutral,
        text: euiTheme.colors.textParagraph,
      };

/** Box styling shared by every reference chip. */
export const getReferenceChipCss = (euiTheme: UseEuiTheme['euiTheme'], tone: ReferenceChipTone) => {
  const colors = getReferenceChipColors(euiTheme, tone);
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: euiTheme.size.xs,
    maxInlineSize: '100%',
    minInlineSize: 0,
    padding: `0 ${euiTheme.size.xs}`,
    border: `${euiTheme.border.width.thin} solid ${colors.border}`,
    borderRadius: euiTheme.border.radius.small,
    backgroundColor: colors.background,
    color: colors.text,
    fontFamily: euiTheme.font.familyCode,
  } as const;
};
