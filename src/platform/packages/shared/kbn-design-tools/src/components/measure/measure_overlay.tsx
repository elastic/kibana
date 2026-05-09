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
import { css } from '@emotion/css';
import { Global } from '@emotion/react';
import { EuiBadge, EuiPortal, EuiWindowEvent, transparentize, useEuiTheme } from '@elastic/eui';

import { SpacingMeasurement } from './spacing_measurement';
import { getElementFromPoint, isEscapeKey } from '../../lib';
import { handleEventPropagation } from '../../lib/dom/handle_event_propagation';
import { clampToViewport } from '../../lib/dom/clamp_to_viewport';

import { calculateSpacingLines } from '../../lib/dom/calculate_spacing';
import type { SpacingLine } from '../../lib/dom/calculate_spacing';

import { MEASURE_OVERLAY_ID } from '../../lib/constants';

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
        zIndex: Number(euiTheme.levels.toast) + 2,
        pointerEvents: 'none',
      }),
    [euiTheme.colors.backgroundFilledText, euiTheme.levels.toast]
  );

  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (isEscapeKey(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setIsMeasuring(false);
      }
    },
    [setIsMeasuring]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeydown, true);
    return () => document.removeEventListener('keydown', handleKeydown, true);
  }, [handleKeydown]);

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
      const target = getElementFromPoint(event);

      if (!target) {
        setHoverRect(null);
        setSpacingLines([]);
        return;
      }

      const rect = target.getBoundingClientRect();
      setHoverRect(rect);

      if (anchorElement && anchorElement !== target) {
        const freshAnchorRect = anchorElement.getBoundingClientRect();
        setAnchorRect(freshAnchorRect);
        const lines = calculateSpacingLines(freshAnchorRect, rect);
        setSpacingLines(lines);
      } else {
        setSpacingLines([]);
      }
    },
    [anchorElement]
  );

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
      handleEventPropagation({ event, callback: handleClick });
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

  const highlightZIndex = Number(euiTheme.levels.toast) + 3;

  const anchorHighlightCss = useMemo(() => {
    if (!anchorRect) return '';
    return css({
      position: 'fixed',
      left: `${anchorRect.left}px`,
      top: `${anchorRect.top}px`,
      width: `${anchorRect.width}px`,
      height: `${anchorRect.height}px`,
      border: `2px solid ${euiTheme.colors.success}`,
      backgroundColor: transparentize(euiTheme.colors.success, 0.15),
      pointerEvents: 'none',
      zIndex: highlightZIndex,
    });
  }, [anchorRect, euiTheme.colors.success, highlightZIndex]);

  const hoverHighlightCss = useMemo(() => {
    if (!hoverRect) return '';
    return css({
      position: 'fixed',
      left: `${hoverRect.left}px`,
      top: `${hoverRect.top}px`,
      width: `${hoverRect.width}px`,
      height: `${hoverRect.height}px`,
      border: `2px solid ${euiTheme.colors.primary}`,
      backgroundColor: transparentize(euiTheme.colors.primary, 0.15),
      pointerEvents: 'none',
      zIndex: highlightZIndex,
    });
  }, [hoverRect, euiTheme.colors.primary, highlightZIndex]);

  return (
    <EuiPortal>
      <Global
        styles={{
          'body *': {
            cursor: 'crosshair !important',
          },
        }}
      />
      <div className={overlayCss} id={MEASURE_OVERLAY_ID} data-test-subj="measureOverlayContainer">
        <EuiWindowEvent event="pointermove" handler={handlePointerMove} />
      </div>
      {anchorRect && (
        <>
          <div className={anchorHighlightCss} data-test-subj="measureAnchorHighlight" />
          <div
            ref={anchorBadgeRef}
            className={css({
              position: 'fixed',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: highlightZIndex + 1,
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
