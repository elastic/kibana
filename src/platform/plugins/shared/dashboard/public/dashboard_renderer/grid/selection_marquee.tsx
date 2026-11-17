/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { SelectionRect } from './use_panel_selection_gestures';

/** The rectangle drawn while selecting panels with a modifier + drag gesture */
export const SelectionMarquee = ({ rect }: { rect: SelectionRect | undefined }) => {
  const styles = useMemoCss(selectionMarqueeStyles);
  if (!rect) return null;

  return (
    <div
      css={styles.marquee}
      data-test-subj="dashboardSelectionMarquee"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.right - rect.left,
        height: rect.bottom - rect.top,
      }}
    />
  );
};

const selectionMarqueeStyles = {
  marquee: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: euiTheme.levels.toast,
      border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.primary}`,
      backgroundColor: transparentize(euiTheme.colors.primary, 0.1),
    }),
};
