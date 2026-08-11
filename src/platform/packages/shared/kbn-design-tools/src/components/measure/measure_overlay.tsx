/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Dispatch, PointerEvent as ReactPointerEvent, SetStateAction } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiPortal, transparentize, useEuiTheme } from '@elastic/eui';
import { SpacingMeasurement } from './spacing_measurement';
import { getElementFromPoint } from '../../lib/dom/get_element_from_point';
import { clampToViewport } from '../../lib/dom/clamp_to_viewport';
import { buildHighlightCss } from '../../lib/dom/build_highlight_css';
import { calculateSpacingLines } from '../../lib/dom/calculate_spacing';
import type { SpacingLine } from '../../lib/dom/calculate_spacing';
import { MEASURE_OVERLAY_ID } from '../../lib/constants';
import { useEscapeKey } from '../../hooks/use_escape_key';
import { useOverlayZIndex } from '../../hooks/use_overlay_z_index';
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

  const overlayCss = useMemo(
    () =>
      css({
        backgroundColor: transparentize(euiTheme.colors.backgroundFilledText, 0.1),
        inset: 0,
        position: 'fixed',
        zIndex: zIndex.overlay,
        pointerEvents: 'auto',
      }),
    [euiTheme.colors.backgroundFilledText, zIndex.overlay]
  );

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

  const rafRef = useRef<number>(0);

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent) => {
      cancelAnimationFrame(rafRef.current);
      const { clientX, clientY } = event;
      rafRef.current = requestAnimationFrame(() => {
        const synth = { clientX, clientY } as PointerEvent;
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
      });
    },
    [anchorElement]
  );

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

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

  const handleMouseEvent = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      const eventTarget = event.target as HTMLElement;
      const isTargetDisabled = eventTarget?.hasAttribute?.('disabled');
      if (event.type === 'click' || isTargetDisabled) {
        handleClick(event);
      }
    },
    [handleClick]
  );

  useEffect(() => {
    document.addEventListener('pointerdown', handleMouseEvent, true);
    document.addEventListener('click', handleMouseEvent, true);

    return () => {
      document.removeEventListener('pointerdown', handleMouseEvent, true);
      document.removeEventListener('click', handleMouseEvent, true);
    };
  }, [handleMouseEvent]);

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
      <GlobalCursorOverride cursor="crosshair" />
      <div
        css={overlayCss}
        id={MEASURE_OVERLAY_ID}
        data-test-subj="measureOverlayContainer"
        onPointerMove={handlePointerMove}
        aria-hidden="true"
      />
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
