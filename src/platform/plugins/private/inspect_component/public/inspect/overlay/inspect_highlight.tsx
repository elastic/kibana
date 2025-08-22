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
  path?: string;
}

export const InspectHighlight = ({ currentPosition, path }: Props) => {
  const { euiTheme } = useEuiTheme();
  const { transform, ...rest } = currentPosition;

  const containerRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const [badgeOffsetX, setBadgeOffsetX] = useState(0);
  const [badgeOffsetY, setBadgeOffsetY] = useState(0);

  const containerCss = css({
    position: 'absolute',
    transform,
    pointerEvents: 'none',
  });

  const highlightCss = css({
    position: 'absolute',
    backgroundColor: transparentize(euiTheme.colors.primary, 0.3),
    border: `2px solid ${euiTheme.colors.primary}`,
    pointerEvents: 'none',
    ...rest,
  });

  useLayoutEffect(() => {
    if (!badgeRef.current || !containerRef.current) return;

    const badgeRect = badgeRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const highlightHeight =
      typeof rest.height === 'number' ? rest.height : parseInt((rest.height as string) || '0', 10);

    // Horizontal adjustment
    const availableRight = viewportWidth - containerRect.left;
    setBadgeOffsetX(badgeRect.width > availableRight ? availableRight - badgeRect.width : 0);

    // Vertical adjustment
    const availableBottom = viewportHeight - (containerRect.top + highlightHeight);
    if (badgeRect.height > availableBottom) {
      // Flip above highlight
      setBadgeOffsetY(-badgeRect.height);
    } else {
      // Place below highlight
      setBadgeOffsetY(highlightHeight);
    }
  }, [path, rest.left, rest.top, rest.width, rest.height]);

  const badgeCss = css({
    position: 'absolute',
    top: badgeOffsetY,
    left: badgeOffsetX,
    whiteSpace: 'nowrap',
  });

  return (
    <div ref={containerRef} className={containerCss}>
      <div className={highlightCss} />
      {path && (
        <div ref={badgeRef} className={badgeCss}>
          <EuiBadge color="primary">{path}</EuiBadge>
        </div>
      )}
    </div>
  );
};
