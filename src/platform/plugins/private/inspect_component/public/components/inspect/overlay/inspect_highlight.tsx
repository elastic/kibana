/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { EuiBadge, transparentize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

interface Props {
  currentPosition: CSSProperties;
  path: string | null;
}

/**
 * InspectHighlight displays a highlight box around the currently
 * inspected HTML element, along with a badge containing the source component display name.
 */
export const InspectHighlight = ({ currentPosition, path }: Props) => {
  const { euiTheme } = useEuiTheme();
  const { transform, ...rest } = currentPosition;

  const containerRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const [badgeOffsetX, setBadgeOffsetX] = useState(0);
  const [badgeOffsetY, setBadgeOffsetY] = useState(0);
  const isFixed = currentPosition.position === 'fixed';

  const containerCss = css({
    position: currentPosition.position || 'absolute',
    transform,
    ...(isFixed ? rest : {}),
    pointerEvents: 'none',
  });

  const highlightCss = css({
    position: 'absolute',
    backgroundColor: transparentize(euiTheme.colors.primary, 0.3),
    border: `2px solid ${euiTheme.colors.primary}`,
    pointerEvents: 'none',
    ...(isFixed ? { top: 0, left: 0, right: 0, bottom: 0 } : rest),
  });

  /** This handles repositoning of the hihglight badge so it's always fully visible. */
  useLayoutEffect(() => {
    if (!badgeRef.current || !containerRef.current) return;

    const badgeRect = badgeRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const highlightHeight =
      typeof rest.height === 'number' ? rest.height : parseInt((rest.height as string) || '0', 10);

    /**
     * Horizontal adjustment.
     * If the badge would overflow the viewport on the right, it will get shifted to the left.
     */
    if (isFixed) {
      const badgeRight = containerRect.left + badgeRect.width;
      setBadgeOffsetX(
        badgeRight > viewportWidth ? viewportWidth - containerRect.left - badgeRect.width : 0
      );
    } else {
      const availableRight = viewportWidth - containerRect.left;
      setBadgeOffsetX(badgeRect.width > availableRight ? availableRight - badgeRect.width : 0);
    }

    /**
     * Vertical adjustment.
     * If the badge would overflow the viewport on the bottom, it will get fliped above the highlight.
     */
    if (isFixed) {
      // For fixed positioning, the container is already positioned at the exact element location
      // Badge should be positioned relative to the container (which is the highlight itself)
      const containerBottom = containerRect.bottom;
      const badgeWouldBeAt = containerBottom + badgeRect.height;

      if (badgeWouldBeAt > viewportHeight) {
        // Flip above highlight - position at negative badge height
        setBadgeOffsetY(-badgeRect.height);
      } else {
        // Place badge below highlight - position at the height of the highlight box
        const containerHeight = containerRect.height;
        setBadgeOffsetY(containerHeight);
      }
    } else {
      const availableBottom = viewportHeight - (containerRect.top + highlightHeight);
      if (badgeRect.height > availableBottom) {
        setBadgeOffsetY(-badgeRect.height);
      } else {
        setBadgeOffsetY(highlightHeight);
      }
    }
  }, [path, rest.left, rest.top, rest.width, rest.height, currentPosition.position, isFixed]);

  const badgeCss = css({
    position: 'absolute',
    top: badgeOffsetY,
    left: badgeOffsetX,
    whiteSpace: 'nowrap',
  });

  return (
    <div ref={containerRef} className={containerCss} data-test-subj="inspectHighlightContainer">
      <div className={highlightCss} data-test-subj="inspectHighlightBox" />
      {path && (
        <div ref={badgeRef} className={badgeCss} data-test-subj="inspectHighlightBadge">
          <EuiBadge color="primary">{path}</EuiBadge>
        </div>
      )}
    </div>
  );
};
