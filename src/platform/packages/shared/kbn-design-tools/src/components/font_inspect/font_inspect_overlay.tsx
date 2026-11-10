/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { css } from '@emotion/react';
import { EuiPortal, useEuiTheme } from '@elastic/eui';
import { FontInfoCard } from './font_info_card';
import { PinnedFontCard } from './pinned_font_card';
import { getElementFromPoint } from '../../lib/dom/get_element_from_point';
import { buildHighlightCss } from '../../lib/dom/build_highlight_css';
import { isIgnoredElement } from '../../lib/dom/is_ignored_element';
import { useInspectionOverlayMount } from '../../lib/inspection_overlay_state';
import { useEscapeKey } from '../../hooks/use_escape_key';
import { useFontInspectCardPosition } from '../../hooks/use_font_inspect_card_position';
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
 * Escape key exits inspect mode entirely.
 */
export const FontInspectOverlay = ({ setIsInspectingFont }: Props) => {
  const { euiTheme } = useEuiTheme();
  const zIndex = useOverlayZIndex();

  const [pinnedEntries, setPinnedEntries] = useState<PinnedEntry[]>([]);
  const nextPinIdRef = useRef(0);

  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const [hoverElement, setHoverElement] = useState<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useInspectionOverlayMount('fontInspect');

  const handleEscape = useCallback(() => setIsInspectingFont(false), [setIsInspectingFont]);
  useEscapeKey(handleEscape);

  useFontInspectCardPosition(cardRef, hoverRect, hoverElement);

  // Attached on `document` (capture phase), not on a backdrop element: pinned
  // cards use `pointer-events: auto` (close button), so a document listener
  // still runs regardless of hit-test target.
  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const { clientX, clientY } = event;
      const pointerTarget = event.target;
      if (pointerTarget instanceof Element && isIgnoredElement(pointerTarget)) {
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
    shouldSkip: (eventTarget) => isIgnoredElement(eventTarget),
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
      <div data-test-subj="fontInspectOverlayContainer" hidden aria-hidden />
      <GlobalCursorOverride cursor="crosshair" allowButtons ignoredElementsCursor="default" />
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
