/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type MutableRefObject, type ReactNode } from 'react';
import {
  EuiButtonIcon,
  EuiIcon,
  EuiPanel,
  EuiToolTip,
  transparentize,
  type EuiButtonIconPropsForButton,
  type UseEuiTheme,
} from '@elastic/eui';
import { keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { createSpringTiming } from './spring';

/**
 * The floating bars at the bottom of the dashboard in edit mode (the selected panels toolbar and the
 * hint bar) share this shell: a bottom-anchored surface with a drop shadow, a clipped frame that the
 * expand animation reveals from the bottom edge, and the same entrance. There's no exit animation:
 * like Linear's bulk actions bar, a bar leaves instantly once the user is done with it.
 */

export const EASE_OUT = 'cubic-bezier(0.2, 0, 0, 1)';

const strings = {
  getShowMore: () =>
    i18n.translate('dashboard.floatingToolbar.showMore', {
      defaultMessage: 'More options',
    }),
  getShowLess: () =>
    i18n.translate('dashboard.floatingToolbar.showLess', {
      defaultMessage: 'Fewer options',
    }),
};

export interface FloatingToolbarProps {
  /** the clipped frame, animated by `useToolbarExpandAnimation` */
  frameRef: MutableRefObject<HTMLDivElement | null>;
  children: ReactNode;
  role?: string;
  'aria-label': string;
  'data-test-subj'?: string;
  /** stays invisible (and holds its entrance) until the content is complete */
  isReady?: boolean;
  /** skips the entrance, e.g. when the bar was visible a moment ago */
  skipEntrance?: boolean;
}

export const FloatingToolbar = ({
  frameRef,
  children,
  role,
  isReady = true,
  skipEntrance = false,
  ...rest
}: FloatingToolbarProps) => {
  const styles = useMemoCss(shellStyles);

  return (
    <div
      css={styles.anchor}
      data-ready={isReady}
      data-skip-entrance={skipEntrance}
      role={role}
      {...rest}
    >
      {/* clipped frame: revealed from the bottom edge when expanding; the shadow lives on the
          parent as a drop-shadow so it follows the clipped shape */}
      <div ref={frameRef} css={styles.frame}>
        <EuiPanel
          hasShadow={false}
          hasBorder={false}
          paddingSize="none"
          borderRadius="m"
          css={styles.surface}
          aria-hidden
        />
        {children}
      </div>
    </div>
  );
};

export const FloatingToolbarButton = ({
  label,
  tooltip,
  ...rest
}: { label: string; tooltip?: string } & Omit<EuiButtonIconPropsForButton, 'aria-label'>) => (
  <EuiToolTip content={tooltip ?? label} disableScreenReaderOutput={!tooltip}>
    <EuiButtonIcon color="text" size="s" iconSize="m" aria-label={label} {...rest} />
  </EuiToolTip>
);

/**
 * Both icons stay rendered and crossfade (opacity + scale + blur) based on the toggle's
 * `aria-expanded`, so the swap under the cursor isn't a hard cut. The crossfade is applied to a
 * wrapper around each icon: EuiIcon's own load animation holds `opacity: 1` (fill `forwards`),
 * which would otherwise keep the hidden icon visible as a blurred "glow".
 */
const ExpandToggleIcon = ({ className }: { className?: string }) => (
  <span className={className} css={expandIconStyles} aria-hidden>
    <span className="dshExpandIcon__maximize">
      <EuiIcon type="maximize" aria-hidden={true} />
    </span>
    <span className="dshExpandIcon__minimize">
      <EuiIcon type="minimize" aria-hidden={true} />
    </span>
  </span>
);

export const FloatingToolbarExpandButton = ({
  isExpanded,
  onClick,
  'data-test-subj': dataTestSubj,
}: {
  isExpanded: boolean;
  onClick: () => void;
  'data-test-subj'?: string;
}) => (
  <FloatingToolbarButton
    label={isExpanded ? strings.getShowLess() : strings.getShowMore()}
    iconType={ExpandToggleIcon}
    onClick={onClick}
    aria-expanded={isExpanded}
    data-test-subj={dataTestSubj}
  />
);

/** Layout pieces shared by the bars' content */
export const floatingToolbarStyles = {
  content: ({ euiTheme }: UseEuiTheme) => ({
    position: 'relative' as const,
    padding: euiTheme.size.s,
  }),
  /** the extra section shown above the main row when expanded */
  more: {
    display: 'flow-root' as const,
    // Keep the persistent main row in control of the bar's width.
    width: 0,
    minWidth: '100%',
  },
  separator: ({ euiTheme }: UseEuiTheme) => ({
    width: euiTheme.border.width.thin,
    alignSelf: 'stretch',
    backgroundColor: euiTheme.border.color,
    margin: `${euiTheme.size.xs} ${euiTheme.size.m}`,
  }),
};

/**
 * Entrance modeled on Linear's bulk actions toolbar: a 15px rise and a fade driven by one spring
 * (stiffness 460, damping 27: lands at ~135ms, overshoots ~6%, then settles). Opacity follows the
 * same curve, so it briefly exceeds 1 with the overshoot, which the browser clamps.
 */
const ENTER_SPRING = createSpringTiming({ stiffness: 460, damping: 27 });

// Linear's hidden state: opacity starts slightly below zero, so the bar is already moving when it
// becomes visible (the browser clamps the negative part)
const enter = keyframes({
  from: { opacity: -0.1, translate: '0 15px' },
  to: { opacity: 1, translate: '0 0' },
});

const expandIconStyles = {
  position: 'relative' as const,
  display: 'inline-block',
  '& > *': {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    transition: `opacity 150ms ${EASE_OUT}, transform 150ms ${EASE_OUT}, filter 150ms ${EASE_OUT}`,
  },
  '.dshExpandIcon__minimize, [aria-expanded="true"] & .dshExpandIcon__maximize': {
    opacity: 0,
    transform: 'scale(0.6)',
    filter: 'blur(3px)',
  },
  '[aria-expanded="true"] & .dshExpandIcon__minimize': {
    opacity: 1,
    transform: 'none',
    filter: 'none',
  },
  '@media (prefers-reduced-motion: reduce)': {
    '& > *': { transition: 'none' },
  },
};

const shellStyles = {
  // bottom-centered anchor: the bar grows upward and equally to both sides
  anchor: ({ euiTheme }: UseEuiTheme) => {
    const shadowColor = transparentize(euiTheme.colors.shadow, 0.16);
    return {
      position: 'fixed' as const,
      bottom: euiTheme.size.l,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: euiTheme.levels.flyout,
      filter: `drop-shadow(0 1px 2px ${shadowColor}) drop-shadow(0 6px 16px ${shadowColor})`,
      // one-shot entrance; `translate` and `scale` compose with the centering `transform` above
      transformOrigin: 'center bottom',
      animation: `${enter} 200ms ${EASE_OUT}`,
      '@supports (animation-timing-function: linear(0, 1))': {
        animation: `${enter} ${ENTER_SPRING.duration}ms ${ENTER_SPRING.easing}`,
      },
      // icons appear with the bar: no separate EuiIcon load fade-in trailing behind the entrance
      // (they're preloaded, see `preloadFloatingToolbarIcons`; this covers a slow first load)
      '.euiIcon': { animation: 'none' },
      '&[data-ready="false"]': { opacity: 0, animation: 'none' },
      '&[data-skip-entrance="true"]': { animation: 'none' },
      '@media (prefers-reduced-motion: reduce)': {
        '&': { animation: 'none' },
      },
    };
  },
  frame: ({ euiTheme }: UseEuiTheme) => ({
    position: 'relative' as const,
    // bottom-aligned, so height changes move the top edge while the bottom stays put
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'flex-end',
    borderRadius: euiTheme.border.radius.medium,
    transformOrigin: 'center bottom',
  }),
  surface: {
    position: 'absolute' as const,
    inset: 0,
  },
};
