/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { EuiBadge, EuiPortal, euiCanAnimate, useEuiTheme, type UseEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { isMacPlatform } from './selection_modifier';

const HINT_DURATION_MS = 1800;
/** Slightly see-through, so it reads as a passing hint rather than UI to interact with */
const HINT_OPACITY = 0.9;

const INTERACTIVE_SELECTOR = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'label',
  'summary',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="tab"]',
].join(', ');

/** Cursors that don't advertise any interaction (e.g. not `pointer` on a chart element or `grab` on a map) */
const PASSIVE_CURSORS = new Set(['auto', 'default']);

const strings = {
  getLabel: (modifier: string) =>
    i18n.translate('dashboard.panelClickHint.label', {
      defaultMessage: '{modifier} + Click to select',
      values: { modifier },
    }),
};

/**
 * Whether a plain click on panel content did nothing: it wasn't handled by the panel, didn't land on
 * an interactive element, and the cursor didn't signal any interaction at that spot.
 */
export const isUnhandledPanelClick = (e: React.MouseEvent): boolean => {
  if (e.defaultPrevented || e.button !== 0 || e.detail > 1) return false;
  const { target } = e;
  if (!(target instanceof Element) || target.closest(INTERACTIVE_SELECTOR)) return false;
  const cursor = window.getComputedStyle(target).cursor || 'auto';
  if (!PASSIVE_CURSORS.has(cursor)) return false;
  // the click ended a text selection
  return window.getSelection()?.isCollapsed ?? true;
};

export interface PanelClickHintProps {
  /** viewport coordinates the hint is centered above, typically the bottom center of the panel */
  position: { x: number; y: number };
  onDismiss: () => void;
}

/** Briefly shows how to select panels, on a panel where a click did nothing */
export const PanelClickHint = ({ position, onDismiss }: PanelClickHintProps) => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemoCss(panelClickHintStyles);
  const modifier = isMacPlatform() ? '⌘' : 'Ctrl';

  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, HINT_DURATION_MS);
    // the hint is pinned to the viewport, so it would drift away from the click
    window.addEventListener('scroll', onDismiss, { capture: true, passive: true });
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('scroll', onDismiss, { capture: true });
    };
  }, [onDismiss]);

  return (
    <EuiPortal>
      <div
        role="status"
        css={styles.hint}
        style={{ left: position.x, top: position.y }}
        data-test-subj="dashboardPanelClickHint"
      >
        <EuiBadge color={euiTheme.components.tooltipBackground}>
          {strings.getLabel(modifier)}
        </EuiBadge>
      </div>
    </EuiPortal>
  );
};

const panelClickHintStyles = {
  hint: ({ euiTheme }: UseEuiTheme) => {
    // centered above the anchor point, inset from the panel's bottom edge
    const restingTransform = `translate(-50%, calc(-100% - ${euiTheme.size.s}))`;
    const lifecycle = keyframes({
      '0%': { opacity: 0, transform: 'translate(-50%, -100%)' },
      '12%, 80%': { opacity: HINT_OPACITY, transform: restingTransform },
      '100%': { opacity: 0, transform: restingTransform },
    });
    return css({
      position: 'fixed',
      zIndex: euiTheme.levels.toast,
      width: 'max-content',
      pointerEvents: 'none',
      opacity: HINT_OPACITY,
      transform: restingTransform,
      [euiCanAnimate]: {
        animation: `${lifecycle} ${HINT_DURATION_MS}ms ease-out both`,
      },
    });
  },
};
