/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
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
    ref: RefObject<HTMLSpanElement>;
    css: Array<SerializedStyles | false>;
    style?: CSSProperties;
  };
  /** Props for the element wrapping the label text; it slides inside the clipping element. */
  trackProps: {
    ref: RefObject<HTMLSpanElement>;
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
  const fadeEndWidth = euiTheme.size.base;
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
        black calc(100% - var(--label-fade-end)),
        transparent
      );

      button:hover &,
      a:hover &,
      button:focus-visible &,
      a:focus-visible & {
        --label-fade-start: ${fadeStartWidth};
        --label-fade-end: 0px;
        ${euiCanAnimate} {
          animation: ${fadeStartIn} ${fadeDuration} ${delay} both,
            ${fadeEndOut} ${fadeDuration} calc(${delay} + ${duration} - ${fadeDuration}) both;
        }
      }

      button:hover & > span,
      a:hover & > span,
      button:focus-visible & > span,
      a:focus-visible & > span {
        transform: translateX(calc(var(--label-overflow-width) * -1px));
        ${euiCanAnimate} {
          transition: transform ${duration} linear ${delay};
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
  const labelRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const [overflowWidth, setOverflowWidth] = useState(0);

  useLayoutEffect(() => {
    const label = labelRef.current;
    const track = trackRef.current;
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
  }, []);

  const isOverflowing = overflowWidth > 0;

  return {
    isOverflowing,
    labelProps: {
      ref: labelRef,
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
    trackProps: { ref: trackRef, css: styles.track },
  };
};
