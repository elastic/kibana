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
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { isMac } from '@kbn/shared-ux-utility';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { SelectionRect } from './use_panel_selection_gestures';

const hintLabel = i18n.translate('dashboard.panelSelectHint.label', {
  defaultMessage: '{modifierKey}+click to select panel',
  values: { modifierKey: isMac ? 'Cmd' : 'Ctrl' },
});

/** Short-lived badge explaining the selection gesture, shown at the bottom of the clicked panel */
export const PanelSelectHint = ({ rect }: { rect: SelectionRect | undefined }) => {
  const styles = useMemoCss(panelSelectHintStyles);
  const { euiTheme } = useEuiTheme();
  if (!rect) return null;

  return (
    <div
      css={styles.hint}
      data-test-subj="dashboardPanelSelectHint"
      style={{ left: (rect.left + rect.right) / 2, top: rect.bottom }}
    >
      <EuiBadge color={euiTheme.colors.textParagraph}>{hintLabel}</EuiBadge>
    </div>
  );
};

const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const panelSelectHintStyles = {
  hint: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: euiTheme.levels.toast,
      // anchored at the panel's bottom center, pulled up inside the panel
      transform: `translate(-50%, calc(-100% - ${euiTheme.size.m}))`,
      animation: `${fadeIn} ${euiTheme.animation.normal} ${euiTheme.animation.resistance}`,
    }),
};
