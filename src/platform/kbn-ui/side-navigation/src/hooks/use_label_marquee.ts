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

// Slide the hidden part of the label into view at a steady speed after a short hover
// delay, and snap back instantly on mouse leave. The measured overflow comes in as a
// unitless CSS variable so these styles are shared by every item.
const getStyles = (euiTheme: EuiThemeComputed) => {
  const delay = euiTheme.animation.slow;
  const duration = 'calc(var(--label-overflow-width) * 20ms)';
  const fadeWidth = euiTheme.size.l;
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
      --label-fade-start: ${fadeWidth};
    }
  `;
  const fadeEndOut = keyframes`
    from {
      --label-fade-end: ${fadeWidth};
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
      --label-fade-end: ${fadeWidth};
      mask-image: linear-gradient(
        to right,
        transparent,
        black var(--label-fade-start),
        black calc(100% - var(--label-fade-end)),
        transparent
      );

      button:hover &,
      a:hover & {
        --label-fade-start: ${fadeWidth};
        --label-fade-end: 0px;
        ${euiCanAnimate} {
          animation: ${fadeStartIn} ${fadeDuration} ${delay} both,
            ${fadeEndOut} ${fadeDuration} calc(${delay} + ${duration} - ${fadeDuration}) both;
        }
      }

      button:hover & > span,
      a:hover & > span {
        transform: translateX(calc(var(--label-overflow-width) * -1px));
        ${euiCanAnimate} {
          transition: transform ${duration} linear ${delay};
        }
      }
    `,
    track: css`
      display: inline-block;
    `,
  };
};

/**
 * Fades an overflowing label and slides its hidden part into view when the parent button or link is hovered.
 */
export const useLabelMarquee = (): LabelMarquee => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(() => getStyles(euiTheme), [euiTheme]);
  const labelRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const [overflowWidth, setOverflowWidth] = useState(0);

  useLayoutEffect(() => {
    const label = labelRef.current;
    const track = trackRef.current;
    if (!label || !track) return;

    const measure = () => setOverflowWidth(Math.max(0, label.scrollWidth - label.clientWidth));
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
      css: [styles.label, isOverflowing && styles.labelOverflowing],
      style: isOverflowing
        ? ({ '--label-overflow-width': overflowWidth } as CSSProperties)
        : undefined,
    },
    trackProps: { ref: trackRef, css: styles.track },
  };
};
