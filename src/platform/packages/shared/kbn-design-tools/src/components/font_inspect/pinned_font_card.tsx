/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useRef } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { FontInfoCard } from './font_info_card';
import { buildHighlightCss } from '../../lib/dom/build_highlight_css';
import { useElementRect } from '../../hooks/use_element_rect';
import { useFontInspectCardPosition } from '../../hooks/use_font_inspect_card_position';
import type { OverlayZIndex } from '../../hooks/use_overlay_z_index';

interface Props {
  element: HTMLElement;
  zIndex: OverlayZIndex;
  onClose: () => void;
}

/**
 * One pinned font-inspect card. Tracks its own rect via `useElementRect`
 * (scroll/resize synced) so it stays aligned independent of pointer
 * movement.
 */
export const PinnedFontCard = ({ element, zIndex, onClose }: Props) => {
  const { euiTheme } = useEuiTheme();
  const rect = useElementRect(element);
  const cardRef = useRef<HTMLDivElement>(null);

  useFontInspectCardPosition(cardRef, rect);

  const highlightCss = useMemo(
    () => buildHighlightCss(rect, euiTheme.colors.success, zIndex.highlight),
    [rect, euiTheme.colors.success, zIndex.highlight]
  );

  return (
    <>
      <div className={highlightCss} data-test-subj="fontInspectPinnedHighlight" />
      <div
        ref={cardRef}
        css={css({
          position: 'fixed',
          pointerEvents: 'auto',
          zIndex: zIndex.label,
        })}
      >
        <FontInfoCard element={element} isPinned onClose={onClose} />
      </div>
    </>
  );
};
