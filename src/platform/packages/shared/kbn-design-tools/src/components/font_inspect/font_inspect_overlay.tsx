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
import { EuiPortal, transparentize, useEuiTheme } from '@elastic/eui';
import { FontInfoCard } from './font_info_card';
import { PinnedFontCard } from './pinned_font_card';
import { getElementFromPoint } from '../../lib/dom/get_element_from_point';
import { clampToViewport } from '../../lib/dom/clamp_to_viewport';
import { buildHighlightCss } from '../../lib/dom/build_highlight_css';
import { isIgnoredElement } from '../../lib/dom/is_ignored_element';
import { FONT_INSPECT_OVERLAY_ID } from '../../lib/constants';
import { useEscapeKey } from '../../hooks/use_escape_key';
import { useOverlayZIndex } from '../../hooks/use_overlay_z_index';
import {
  useOverlayClickCapture,
  useThrottledDocumentPointerMove,
} from '../../hooks/use_overlay_pointer_events';
import { GlobalCursorOverride } from '../global_cursor_override';

interface Props {
  setIsInspectingFont: Dispatch<SetStateAction<boolean>>;
}

interface PinnedEntry {
  id: number;
  element: HTMLElement;
}

/**
 * Font inspect overlay: hover to preview typography, click to pin.
 * Multiple elements can be pinned at once; clicking a pinned element unpins it.
 * Escape exits inspect mode entirely.
 */
export const FontInspectOverlay = ({ setIsInspectingFont }: Props) => {
  const { euiTheme } = useEuiTheme();
  const zIndex = useOverlayZIndex();

  const [pinnedEntries, setPinnedEntries] = useState<PinnedEntry[]>([]);
  const nextPinIdRef = useRef(0);

  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const [hoverElement, setHoverElement] = useState<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const overlayCss = useMemo(
    () =>
      css({
        backgroundColor: transparentize(euiTheme.colors.backgroundFilledText, 0.1),
        inset: 0,
        position: 'fixed',
        zIndex: zIndex.overlay,
        pointerEvents: 'none',
      }),
    [euiTheme.colors.backgroundFilledText, zIndex.overlay]
  );

  const handleEscape = useCallback(() => setIsInspectingFont(false), [setIsInspectingFont]);
  useEscapeKey(handleEscape);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || !hoverRect) return;
    const { width, height } = el.getBoundingClientRect();
    const desiredLeft = hoverRect.left + hoverRect.width / 2 - width / 2;
    const desiredTop = hoverRect.bottom + 4;
    const clamped = clampToViewport(desiredLeft, desiredTop, width, height);
    el.style.left = `${clamped.left}px`;
    el.style.top = `${clamped.top}px`;
  }, [hoverRect, hoverElement]);

  // Attached on `document` (capture phase), not via the backdrop's
  // `onPointerMove`: the pinned card renders above the backdrop with
  // `pointer-events: auto` (so its close button works), which means the
  // backdrop never receives pointer events while the cursor is over a
  // pinned panel - a document-level listener still fires regardless of
  // which element ends up as the hit-test target.
  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const { clientX, clientY } = event;
      const pointerTarget = event.target;
      // getElementFromPoint deliberately "sees through" the backdrop to
      // reveal real page content underneath it. But when the pointer is
      // directly over actual devtool UI chrome (e.g. a pinned card), that
      // same pass-through walks past the card's own (ignored) elements
      // down to whatever page content happens to sit beneath it on
      // screen - showing a bogus hover preview for an unrelated element.
      // Only the backdrop itself should get the pass-through treatment.
      if (
        pointerTarget instanceof Element &&
        pointerTarget.id !== FONT_INSPECT_OVERLAY_ID &&
        isIgnoredElement(pointerTarget)
      ) {
        setHoverRect(null);
        setHoverElement(null);
        return;
      }

      const synth = new MouseEvent('mousemove', { clientX, clientY });
      const target = getElementFromPoint(synth);

      // Drop pinned entries removed from the DOM since they were pinned.
      setPinnedEntries((entries) => {
        const stillConnected = entries.filter((entry) => entry.element.isConnected);
        return stillConnected.length === entries.length ? entries : stillConnected;
      });

      if (!target) {
        setHoverRect(null);
        setHoverElement(null);
        return;
      }

      const isTargetPinned = pinnedEntries.some((entry) => entry.element === target);
      if (isTargetPinned) {
        // Avoid stacking a transient hover card on top of a pinned one.
        setHoverRect(null);
        setHoverElement(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      setHoverRect(rect);
      setHoverElement(target);
    },
    [pinnedEntries]
  );

  useThrottledDocumentPointerMove(handlePointerMove);

  const handleClick = useCallback((event: MouseEvent) => {
    const target = getElementFromPoint(event);

    if (!target) {
      return;
    }

    setPinnedEntries((entries) => {
      const existingIndex = entries.findIndex((entry) => entry.element === target);
      if (existingIndex >= 0) {
        return entries.filter((_, index) => index !== existingIndex);
      }
      return [...entries, { id: nextPinIdRef.current++, element: target }];
    });

    // The click target is now (un)pinned; clear the transient hover preview
    // so it doesn't briefly double up with the pinned card.
    setHoverRect(null);
    setHoverElement(null);
  }, []);

  useOverlayClickCapture({
    onActivate: handleClick,
    shouldSkip: (eventTarget) =>
      eventTarget.id !== FONT_INSPECT_OVERLAY_ID && isIgnoredElement(eventTarget),
  });

  const hoverHighlightCss = useMemo(
    () =>
      hoverRect ? buildHighlightCss(hoverRect, euiTheme.colors.primary, zIndex.highlight) : '',
    [hoverRect, euiTheme.colors.primary, zIndex.highlight]
  );

  const handleUnpin = useCallback((id: number) => {
    setPinnedEntries((entries) => entries.filter((entry) => entry.id !== id));
  }, []);

  return (
    <EuiPortal>
      <GlobalCursorOverride cursor="crosshair" allowButtons ignoredElementsCursor="default" />
      <div
        css={overlayCss}
        id={FONT_INSPECT_OVERLAY_ID}
        data-test-subj="fontInspectOverlayContainer"
        aria-hidden="true"
      />
      {hoverRect && (
        <div className={hoverHighlightCss} data-test-subj="fontInspectHoverHighlight" />
      )}
      {hoverElement && hoverRect && (
        <div
          ref={cardRef}
          css={css({
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: zIndex.label,
          })}
        >
          <FontInfoCard element={hoverElement} isPinned={false} />
        </div>
      )}
      {pinnedEntries.map((entry) => (
        <PinnedFontCard
          key={entry.id}
          element={entry.element}
          zIndex={zIndex}
          onClose={() => handleUnpin(entry.id)}
        />
      ))}
    </EuiPortal>
  );
};
