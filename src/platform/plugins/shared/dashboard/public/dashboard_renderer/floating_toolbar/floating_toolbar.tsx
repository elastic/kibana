/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, type MutableRefObject, type ReactNode } from 'react';
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

/**
 * The floating bars at the bottom of the dashboard in edit mode (the selected panels toolbar and the
 * hint bar) share this shell: a bottom-anchored surface with a drop shadow, a clipped frame that the
 * expand animation reveals from the bottom edge, and the same entrance / exit motion.
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
  /** plays the exit; the parent unmounts the bar once it's done */
  isExiting?: boolean;
  /** skips the entrance, e.g. when the bar was visible a moment ago */
  skipEntrance?: boolean;
}

export const FloatingToolbar = ({
  frameRef,
  children,
  role,
  isReady = true,
  isExiting = false,
  skipEntrance = false,
  ...rest
}: FloatingToolbarProps) => {
  const styles = useMemoCss(shellStyles);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (rootRef.current) rootRef.current.inert = isExiting;
  }, [isExiting]);

  return (
    <div
      ref={rootRef}
      css={styles.anchor}
      data-ready={isReady}
      data-exiting={isExiting}
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
 * `aria-expanded`, so the swap under the cursor isn't a hard cut.
 */
const ExpandToggleIcon = ({ className }: { className?: string }) => (
  <span className={className} css={expandIconStyles} aria-hidden>
    <EuiIcon type="maximize" className="dshExpandIcon__maximize" aria-hidden={true} />
    <EuiIcon type="minimize" className="dshExpandIcon__minimize" aria-hidden={true} />
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

const enter = keyframes({
  from: { opacity: 0, translate: '0 8px', scale: '0.97' },
  to: { opacity: 1, translate: '0 0', scale: '1' },
});

// quieter than the entrance: smaller travel, faster, eases in as the user moves on
const exit = keyframes({
  from: { opacity: 1, translate: '0 0', scale: '1' },
  to: { opacity: 0, translate: '0 4px', scale: '0.98' },
});

const expandIconStyles = {
  position: 'relative' as const,
  display: 'inline-block',
  '& > *': {
    position: 'absolute' as const,
    inset: 0,
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
      '&[data-ready="false"]': { opacity: 0, animation: 'none' },
      '&[data-skip-entrance="true"]': { animation: 'none' },
      '&[data-exiting="true"]': {
        animation: `${exit} 150ms cubic-bezier(0.4, 0, 1, 1) forwards`,
        pointerEvents: 'none' as const,
      },
      '@media (prefers-reduced-motion: reduce)': {
        '&, &[data-exiting="true"]': { animation: 'none' },
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
