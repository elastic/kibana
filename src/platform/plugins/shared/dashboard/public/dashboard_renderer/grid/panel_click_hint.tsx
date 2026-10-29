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

/**
 * The panel's drag area: the whole header row (the title is the registered drag handle, but the
 * empty space next to it reads as part of it), the move button in the hover actions, and the
 * strip along the top edge of panels without a title
 */
const DRAG_AREA_SELECTOR =
  '.embPanel__header, .kbnGridPanel--dragHandle, .dshDashboardGrid__hintArea';

/** Controls inside the header (e.g. the title editor or badges) keep their own clicks */
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

const isPointInside = (element: Element, x: number, y: number) => {
  if (window.getComputedStyle(element).visibility === 'hidden') return false;
  const { left, right, top, bottom } = element.getBoundingClientRect();
  // a collapsed handle (e.g. the move button outside edit mode) has no area to click
  if (right <= left || bottom <= top) return false;
  return x >= left && x <= right && y >= top && y <= bottom;
};

const strings = {
  getLabel: (modifier: string) =>
    i18n.translate('dashboard.panelClickHint.label', {
      defaultMessage: '{modifier} + Click to select panel',
      values: { modifier },
    }),
};

/**
 * Whether a plain click on panel content did nothing: it wasn't handled by the panel, didn't land on
 * an interactive element, and the cursor didn't signal any interaction at that spot.
 */
/**
 * Whether a plain click landed on the panel's drag area, which shows the hint instead of selecting.
 * In select mode the header ignores the pointer, so the click is also matched against its bounds.
 */
export const isDragAreaClick = (e: React.MouseEvent, panel: Element): boolean => {
  if (e.defaultPrevented || e.button !== 0 || e.detail > 1) return false;
  const { target } = e;
  if (!(target instanceof Element)) return false;
  const interactive = target.closest(INTERACTIVE_SELECTOR);
  if (interactive && !interactive.matches(DRAG_AREA_SELECTOR)) return false;
  // the click ended a text selection
  if (!(window.getSelection()?.isCollapsed ?? true)) return false;
  if (target.closest(DRAG_AREA_SELECTOR)) return true;
  return Array.from(panel.querySelectorAll(DRAG_AREA_SELECTOR)).some((handle) =>
    isPointInside(handle, e.clientX, e.clientY)
  );
};

export interface PanelClickHintProps {
  /** viewport coordinates the hint hangs centered below, typically the top center of the panel */
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
    // centered below the anchor point, inset from the panel's top edge so it sits inside the panel
    const restingTransform = `translate(-50%, ${euiTheme.size.s})`;
    const lifecycle = keyframes({
      '0%': { opacity: 0, transform: 'translate(-50%, 0)' },
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
