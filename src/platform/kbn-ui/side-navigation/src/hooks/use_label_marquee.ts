/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useLayoutEffect, useMemo, useState } from 'react';
import type { CSSProperties, RefCallback } from 'react';
import { euiCanAnimate, useEuiTheme } from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import type { SerializedStyles } from '@emotion/react';

interface LabelMarqueeOptions {
  /** Horizontal padding of the row; faded and hidden text may extend into it. */
  gutter: string;
  /** Whether nothing precedes the label in the row, so it may use the leading padding. */
  isLabelFirst: boolean;
  /** Whether nothing follows the label in the row, so it may also use the trailing padding. */
  isLabelLast: boolean;
}

interface LabelMarquee {
  isOverflowing: boolean;
  /** Props for the clipping element; it fills the available width. */
  labelProps: {
    ref: RefCallback<HTMLSpanElement>;
    css: Array<SerializedStyles | false>;
    style?: CSSProperties;
  };
  /** Props for the element wrapping the label text; it slides inside the clipping element. */
  trackProps: {
    ref: RefCallback<HTMLSpanElement>;
    css: SerializedStyles;
  };
}

// On hover or keyboard focus, slide the hidden part of the label into view at a steady
// speed after a short delay, and snap back instantly when it ends. The measured overflow
// comes in as a unitless CSS variable so these styles are shared by every item.
const getStyles = (euiTheme: EuiThemeComputed, gutter: string) => {
  const delay = euiTheme.animation.slow;
  const duration = 'calc(var(--label-overflow-width) * 20ms)';
  // With the leading bleed, the start fade fits in the gutter, so slid text stays fully
  // visible from the text's normal start position.
  const fadeStartWidth = gutter;
  const fadeEndWidth = euiTheme.size.l;
  // An eased end fade makes the text dissolve instead of looking cut at the row edge or
  // next to a badge. Each stop is [distance from the end as a share of the fade, opacity].
  const fadeEndStops = (
    [
      [1, 1],
      [0.8, 0.92],
      [0.6, 0.7],
      [0.4, 0.42],
      [0.2, 0.15],
      [0, 0],
    ] as const
  )
    .map(
      ([distance, alpha]) =>
        `rgb(0 0 0 / ${alpha}) calc(100% - var(--label-fade-end) * ${distance})`
    )
    .join(', ');
  const fadeDuration = euiTheme.animation.normal;

  // Each edge fades only while text is hidden past it: the start fade comes in as the
  // slide begins, the end fade goes out as it finishes. Registered properties let the
  // gradient stops animate. Keyframes instead of transitions because a delayed custom
  // property transition can outlive a quick hover, showing the start fade at rest.
  const fadeStartIn = keyframes`
    from {
      --label-fade-start: 0px;
    }
    to {
      --label-fade-start: ${fadeStartWidth};
    }
  `;
  const fadeEndOut = keyframes`
    from {
      --label-fade-end: ${fadeEndWidth};
    }
    to {
      --label-fade-end: 0px;
    }
  `;
  // An animation instead of a transition so a re-measured overflow, e.g. when the label
  // turns semibold on highlight, retargets the running slide instead of restarting its delay.
  const slide = keyframes`
    to {
      transform: translateX(calc(var(--label-overflow-width) * -1px));
    }
  `;

  return {
    label: css`
      display: block;
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
    `,
    labelOverflowing: css`
      @property --label-fade-start {
        syntax: '<length>';
        inherits: false;
        initial-value: 0px;
      }
      @property --label-fade-end {
        syntax: '<length>';
        inherits: false;
        initial-value: 0px;
      }
      --label-fade-start: 0px;
      --label-fade-end: ${fadeEndWidth};
      mask-image: linear-gradient(
        to right,
        transparent,
        black var(--label-fade-start),
        ${fadeEndStops}
      );

      // With reduced motion the label stays still and faded; the tooltip shows the full text.
      ${euiCanAnimate} {
        button:hover &,
        a:hover &,
        button:focus-visible &,
        a:focus-visible & {
          --label-fade-start: ${fadeStartWidth};
          --label-fade-end: 0px;
          // A slide shorter than the fade would otherwise start the end fade before the slide.
          animation: ${fadeStartIn} ${fadeDuration} ${delay} both,
            ${fadeEndOut} ${fadeDuration} calc(${delay} + max(0ms, ${duration} - ${fadeDuration}))
              both;
        }

        button:hover & > span,
        a:hover & > span,
        button:focus-visible & > span,
        a:focus-visible & > span {
          animation: ${slide} ${duration} linear ${delay} both;
        }
      }
    `,
    // Pull the clip area into the row padding without moving the text.
    labelOverflowingFirst: css`
      margin-left: calc(${gutter} * -1);
      padding-left: ${gutter};
    `,
    labelOverflowingLast: css`
      margin-right: calc(${gutter} * -1);
      padding-right: ${gutter};
    `,
    track: css`
      display: inline-block;
    `,
  };
};

/**
 * Fades an overflowing label and slides its hidden part into view when the parent button or link is hovered or focused.
 */
export const useLabelMarquee = ({
  gutter,
  isLabelFirst,
  isLabelLast,
}: LabelMarqueeOptions): LabelMarquee => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(() => getStyles(euiTheme, gutter), [euiTheme, gutter]);
  // State instead of refs so a remounted label is measured and observed again.
  const [label, setLabel] = useState<HTMLSpanElement | null>(null);
  const [track, setTrack] = useState<HTMLSpanElement | null>(null);
  const [overflowWidth, setOverflowWidth] = useState(0);

  useLayoutEffect(() => {
    if (!label || !track) return;

    // Compare against the content box: the gutter padding is not space for the text at rest.
    const measure = () => {
      const { paddingLeft, paddingRight } = getComputedStyle(label);
      const contentWidth = label.clientWidth - parseFloat(paddingLeft) - parseFloat(paddingRight);
      setOverflowWidth(Math.max(0, track.offsetWidth - contentWidth));
    };
    measure();

    // The label resizes with the row, the track with the text.
    const observer = new ResizeObserver(measure);
    observer.observe(label);
    observer.observe(track);
    return () => observer.disconnect();
  }, [label, track]);

  const isOverflowing = overflowWidth > 0;

  return {
    isOverflowing,
    labelProps: {
      ref: setLabel,
      css: [
        styles.label,
        isOverflowing && styles.labelOverflowing,
        isOverflowing && isLabelFirst && styles.labelOverflowingFirst,
        isOverflowing && isLabelLast && styles.labelOverflowingLast,
      ],
      style: isOverflowing
        ? ({ '--label-overflow-width': overflowWidth } as CSSProperties)
        : undefined,
    },
    trackProps: { ref: setTrack, css: styles.track },
  };
};
