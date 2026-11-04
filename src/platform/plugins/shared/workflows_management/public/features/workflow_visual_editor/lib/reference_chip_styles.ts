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

/** Box styling shared by every reference chip (the editing view reuses it for decorations). */
export const getReferenceChipCss = (euiTheme: UseEuiTheme['euiTheme'], tone: ReferenceChipTone) => {
  const isWarning = tone === 'warning';
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: euiTheme.size.xs,
    maxInlineSize: '100%',
    minInlineSize: 0,
    padding: `0 ${euiTheme.size.xs}`,
    border: `${euiTheme.border.width.thin} solid ${
      isWarning ? euiTheme.colors.borderBaseWarning : euiTheme.colors.borderBaseNeutral
    }`,
    borderRadius: euiTheme.border.radius.small,
    backgroundColor: isWarning
      ? euiTheme.colors.backgroundBaseWarning
      : euiTheme.colors.backgroundBaseNeutral,
    color: isWarning ? euiTheme.colors.textWarning : euiTheme.colors.textParagraph,
    fontFamily: euiTheme.font.familyCode,
  } as const;
};
