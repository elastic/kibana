/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, useEuiTheme, useResizeObserver } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

export interface TemplateCardTagsProps {
  categories: string[];
}

/**
 * Renders a template's category tags on a single row. Tags that don't fit are
 * collapsed into a trailing "+N" counter badge (e.g. `root-cause-analysis`,
 * `ai-agent` `+1`). The fit is measured against the available width and
 * recomputed whenever the card resizes.
 */
export const TemplateCardTags = React.memo<TemplateCardTagsProps>(({ categories }) => {
  const { euiTheme } = useEuiTheme();
  const gap = euiTheme.size.xs;

  // Callback ref (via state) so useResizeObserver starts observing once the node
  // mounts and re-runs when its width changes.
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const { width: containerWidth } = useResizeObserver(container);

  const [visibleCount, setVisibleCount] = useState(categories.length);

  useLayoutEffect(() => {
    const measureEl = measureRef.current;
    if (!measureEl || containerWidth === 0) {
      return;
    }
    const gapPx = parseFloat(gap);
    const tagWidths = Array.from(measureEl.querySelectorAll<HTMLElement>('[data-tag-measure]')).map(
      (el) => el.getBoundingClientRect().width
    );
    const overflowEl = measureEl.querySelector<HTMLElement>('[data-overflow-measure]');
    const overflowWidth = overflowEl ? overflowEl.getBoundingClientRect().width : 0;

    // Greedily fit tags left-to-right on one row.
    let used = 0;
    let count = 0;
    for (const width of tagWidths) {
      const next = width + (count > 0 ? gapPx : 0);
      if (used + next > containerWidth) {
        break;
      }
      used += next;
      count += 1;
    }

    // If some tags overflow, reserve room for the "+N" counter on the same row,
    // dropping trailing tags until it fits.
    if (count < tagWidths.length) {
      while (count > 0 && used + gapPx + overflowWidth > containerWidth) {
        count -= 1;
        used -= tagWidths[count] + (count > 0 ? gapPx : 0);
      }
    }

    // Always keep at least one tag visible so the row is never just a counter.
    setVisibleCount(tagWidths.length > 0 ? Math.max(count, 1) : 0);
  }, [containerWidth, gap, categories]);

  const overflowCount = categories.length - visibleCount;

  const rowCss = useMemo(
    () => css`
      display: flex;
      gap: ${gap};
      overflow: hidden;
      inline-size: 100%;
    `,
    [gap]
  );

  if (categories.length === 0) {
    return null;
  }

  return (
    <div css={css({ position: 'relative', inlineSize: '100%' })}>
      {/* Off-screen measuring row: every tag plus a worst-case counter, at natural width. */}
      <div
        ref={measureRef}
        aria-hidden
        css={css`
          position: absolute;
          inset-block-start: 0;
          inset-inline-start: 0;
          display: flex;
          visibility: hidden;
          pointer-events: none;
          white-space: nowrap;
        `}
      >
        {categories.map((category) => (
          <EuiBadge key={category} data-tag-measure color="hollow">
            {category}
          </EuiBadge>
        ))}
        <EuiBadge data-overflow-measure color="hollow">{`+${categories.length}`}</EuiBadge>
      </div>

      <div ref={setContainer} css={rowCss}>
        {categories.slice(0, visibleCount).map((category) => (
          <EuiBadge key={category} color="hollow">
            {category}
          </EuiBadge>
        ))}
        {overflowCount > 0 && (
          <EuiBadge color="hollow" title={categories.slice(visibleCount).join(', ')}>
            {`+${overflowCount}`}
          </EuiBadge>
        )}
      </div>
    </div>
  );
});
TemplateCardTags.displayName = 'TemplateCardTags';
