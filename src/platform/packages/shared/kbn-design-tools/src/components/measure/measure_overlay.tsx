/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiPortal, useEuiTheme } from '@elastic/eui';
import { SpacingMeasurement } from './spacing_measurement';
import { getElementFromPoint } from '../../lib/dom/get_element_from_point';
import { clampToViewport } from '../../lib/dom/clamp_to_viewport';
import { buildHighlightCss } from '../../lib/dom/build_highlight_css';
import { calculateSpacingLines } from '../../lib/dom/calculate_spacing';
import type { SpacingLine } from '../../lib/dom/calculate_spacing';
import { useInspectionOverlayMount } from '../../lib/inspection_overlay_state';
import { useEscapeKey } from '../../hooks/use_escape_key';
import { useOverlayZIndex } from '../../hooks/use_overlay_z_index';
import {
  useOverlayClickCapture,
  useThrottledDocumentPointerMove,
} from '../../hooks/use_overlay_pointer_events';
import { GlobalCursorOverride } from '../global_cursor_override';

interface Props {
  setIsMeasuring: Dispatch<SetStateAction<boolean>>;
}

/**
 * MeasureOverlay provides visual measurements between components.
 * - Click to select an anchor element.
 * - Hover over other elements to see spacing distances between anchor and hovered element.
 * - Click again to select a new anchor, or press Escape to exit.
 */
export const MeasureOverlay = ({ setIsMeasuring }: Props) => {
  const { euiTheme } = useEuiTheme();
  const zIndex = useOverlayZIndex();

  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const [spacingLines, setSpacingLines] = useState<SpacingLine[]>([]);
  const anchorBadgeRef = useRef<HTMLDivElement>(null);

  useInspectionOverlayMount('measure');

  const handleEscape = useCallback(() => setIsMeasuring(false), [setIsMeasuring]);
  useEscapeKey(handleEscape);

  // Clamp anchor badge position after render so it doesn't overflow the viewport
  useEffect(() => {
    const el = anchorBadgeRef.current;
    if (!el || !anchorRect) return;
    const { width, height } = el.getBoundingClientRect();
    const desiredLeft = anchorRect.left + anchorRect.width / 2 - width / 2;
    const desiredTop = anchorRect.bottom + 4;
    const clamped = clampToViewport(desiredLeft, desiredTop, width, height);
    el.style.left = `${clamped.left}px`;
    el.style.top = `${clamped.top}px`;
  }, [anchorRect]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const { clientX, clientY } = event;
      const synth = new MouseEvent('mousemove', { clientX, clientY });
      const target = getElementFromPoint(synth);

      if (!target) {
        setHoverRect(null);
        setSpacingLines([]);
        return;
      }

      const rect = target.getBoundingClientRect();
      setHoverRect(rect);

      if (anchorElement && anchorElement.isConnected && anchorElement !== target) {
        const freshAnchorRect = anchorElement.getBoundingClientRect();
        setAnchorRect(freshAnchorRect);
        const lines = calculateSpacingLines(freshAnchorRect, rect);
        setSpacingLines(lines);
      } else {
        if (anchorElement && !anchorElement.isConnected) {
          setAnchorElement(null);
          setAnchorRect(null);
        }
        setSpacingLines([]);
      }
    },
    [anchorElement]
  );

  useThrottledDocumentPointerMove(handlePointerMove);

  const handleClick = useCallback((event: MouseEvent) => {
    const target = getElementFromPoint(event);

    if (!target) {
      return;
    }

    const rect = target.getBoundingClientRect();
    setAnchorElement(target);
    setAnchorRect(rect);
    setSpacingLines([]);
  }, []);

  useOverlayClickCapture({ onActivate: handleClick });

  const anchorHighlightCss = useMemo(
    () =>
      anchorRect ? buildHighlightCss(anchorRect, euiTheme.colors.success, zIndex.highlight) : '',
    [anchorRect, euiTheme.colors.success, zIndex.highlight]
  );

  const hoverHighlightCss = useMemo(
    () =>
      hoverRect ? buildHighlightCss(hoverRect, euiTheme.colors.primary, zIndex.highlight) : '',
    [hoverRect, euiTheme.colors.primary, zIndex.highlight]
  );

  return (
    <EuiPortal>
      <div data-test-subj="measureOverlayContainer" hidden aria-hidden />
      <GlobalCursorOverride cursor="crosshair" />
      {anchorRect && (
        <>
          <div className={anchorHighlightCss} data-test-subj="measureAnchorHighlight" />
          <div
            ref={anchorBadgeRef}
            css={css({
              position: 'fixed',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: zIndex.label,
            })}
          >
            <EuiBadge
              color="success"
              css={{
                fontFamily: euiTheme.font.familyCode,
              }}
            >
              {Math.round(anchorRect.width)} x {Math.round(anchorRect.height)}
            </EuiBadge>
          </div>
        </>
      )}
      {hoverRect && <div className={hoverHighlightCss} data-test-subj="measureHoverHighlight" />}
      <SpacingMeasurement lines={spacingLines} />
    </EuiPortal>
  );
};
