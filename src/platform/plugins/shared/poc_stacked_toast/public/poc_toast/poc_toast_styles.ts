/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css as emotionClassName } from '@emotion/css';
import { css, keyframes } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';
import type { PocToastPlacement, PocToastType } from './poc_toast_types';
import { POC_TOAST_MAX_CARD_WIDTH, POC_TOAST_STACK_GAP } from './poc_toast_motion';

const SCROLL_SHADOW_ROOM = 16;

/** Collapsed (no width): sizes to the front toast. Expanded: locked width, scrollable list. */
export const getPocToastColumnClassName = (expandedWidth: number | undefined) =>
  emotionClassName`
    position: relative;
    display: flex;
    flex-direction: column;
    max-width: 100%;
    ${
      expandedWidth === undefined
        ? 'width: max-content;'
        : `
      width: ${expandedWidth}px;
      gap: ${POC_TOAST_STACK_GAP}px;
      max-height: calc(100vh - ${SCROLL_SHADOW_ROOM * 2}px);
      overflow: hidden auto;
      overscroll-behavior: contain;
      /* A visible scrollbar would steal width from the cards and make them rewrap. */
      scrollbar-width: none;
      &::-webkit-scrollbar {
        display: none;
      }
      /* Room for card shadows, kept outside the locked width so cards don't shrink. */
      box-sizing: content-box;
      padding: ${SCROLL_SHADOW_ROOM}px;
      margin: -${SCROLL_SHADOW_ROOM}px;
    `
    }
  `;

export const getPocToastCardMotionClassName = (
  index: number,
  isExpanded: boolean,
  isPresent: boolean
) => {
  const isPeekCard = !isExpanded && index > 0;
  // Collapsed, only the front toast is in flow, so the column is exactly its size.
  const isInFlow = isExpanded || (index === 0 && isPresent);

  return emotionClassName`
    position: ${isInFlow ? 'relative' : 'absolute'};
    inset: 0 auto ${isPeekCard ? '0' : 'auto'} 0;
    width: 100%;
    flex-shrink: 0;
    transform-origin: bottom center;
    pointer-events: ${isPeekCard && index > 2 ? 'none' : 'auto'};
  `;
};

export const pocToastClearAllMotionClassName = emotionClassName`
  position: sticky;
  bottom: 0;
  /* Cards get z-index up to the stack size via motion, so this must stay above them. */
  z-index: 10000;
  width: 100%;
  flex-shrink: 0;
`;

export const pocToastAnchorStyles = (
  { euiTheme }: UseEuiTheme,
  placement: PocToastPlacement
) => css`
  position: fixed;
  top: 16px;
  ${placement === 'top-right'
    ? 'right: 16px;'
    : `
    left: 50%;
    transform: translateX(-50%);
  `}
  z-index: ${Number(euiTheme.levels.toast ?? 9000) + 1};
  width: max-content;
  max-width: min(calc(100vw - ${euiTheme.size.l}), ${POC_TOAST_MAX_CARD_WIDTH}px);
`;

export const pocToastControlsStyles = ({ euiTheme }: UseEuiTheme) => css`
  position: fixed;
  /* Clears the developer toolbar, which sits along the bottom edge at the same level. */
  bottom: ${euiTheme.size.xxxl};
  left: calc(var(--kbn-layout--navigation-width, 0px) + ${euiTheme.size.base});
  z-index: ${Number(euiTheme.levels.toast ?? 9000) + 1};
  display: flex;
  align-items: center;
  gap: ${euiTheme.size.xs};
  padding: ${euiTheme.size.xs} ${euiTheme.size.xs} ${euiTheme.size.xs} ${euiTheme.size.s};
  border-radius: ${euiTheme.border.radius.medium};
  background-color: ${euiTheme.colors.backgroundFilledAccent};
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
`;

const gradientSettle = keyframes`
  from {
    background-position: 100% 100%, 0 0, 0 0;
  }
  to {
    background-position: 0% 0%, 0 0, 0 0;
  }
`;

export const pocToastCardStyles = (
  { euiTheme, colorMode }: UseEuiTheme,
  toastType: PocToastType,
  isPeekCard: boolean
) => {
  const isDark = colorMode === 'DARK';
  const tintByType: Record<PocToastType, string> = {
    info: euiTheme.colors.backgroundLightPrimary,
    warning: euiTheme.colors.backgroundLightWarning,
    error: euiTheme.colors.backgroundLightDanger,
  };
  const fill = isPeekCard
    ? isDark
      ? 'rgba(24, 24, 27, 0.9)'
      : 'rgba(255, 255, 255, 0.9)'
    : isDark
    ? '#18181b'
    : '#ffffff';
  const glassHighlight = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.9)';
  const shadow = isDark
    ? '0 2px 6px rgba(0, 0, 0, 0.2), 0 0 24px rgba(0, 0, 0, 0.3)'
    : '0 2px 6px rgba(0, 0, 0, 0.04), 0 0 24px rgba(0, 0, 0, 0.08)';
  const fontSizeS = '0.8125rem';

  return css`
    position: relative;
    box-sizing: border-box;
    display: flex;
    align-items: ${isPeekCard ? 'center' : 'flex-start'};
    justify-content: space-between;
    gap: ${euiTheme.size.m};
    width: 100%;
    max-width: ${POC_TOAST_MAX_CARD_WIDTH}px;
    height: ${isPeekCard ? '100%' : 'auto'};
    overflow: ${isPeekCard ? 'hidden' : 'visible'};
    padding: ${euiTheme.size.m};
    border: 1px solid transparent;
    border-radius: ${euiTheme.size.m};
    background: linear-gradient(
          to top left,
          ${tintByType[toastType]} 0%,
          ${euiTheme.colors.backgroundBasePlain} 50%
        )
        padding-box,
      linear-gradient(${fill}, ${fill}) padding-box,
      linear-gradient(
          135deg,
          ${glassHighlight} 0%,
          ${euiTheme.colors.borderBaseSubdued} 45%,
          ${euiTheme.colors.borderBaseSubdued} 70%,
          ${glassHighlight} 100%
        )
        border-box;
    background-size: 200% 200%, auto, auto;
    background-position: 0% 0%, 0 0, 0 0;
    background-repeat: no-repeat;
    box-shadow: inset 0 1px 0 ${glassHighlight}, ${shadow};
    animation: ${gradientSettle} 900ms ease-out 600ms both;
    ${isPeekCard ? 'backdrop-filter: blur(12px);' : ''}

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }

    .pocToastCardLeading {
      display: flex;
      align-items: flex-start;
      gap: ${euiTheme.size.m};
      flex: 1;
      min-width: 0;
    }

    .pocToastCardIcon {
      flex-shrink: 0;
      line-height: 0;
    }

    .pocToastCardCopy,
    .pocToastCardTitle {
      min-width: 0;
    }

    .pocToastCardTitle {
      margin: 0;
      font-size: 0.875rem;
      font-weight: ${euiTheme.font.weight.medium};
      line-height: 1.35;
      color: ${isDark ? '#f4f4f5' : '#18181b'};
    }

    .pocToastCardPeek {
      align-items: center;

      .pocToastCardTitle {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .pocToastCardBody {
      margin: ${euiTheme.size.xxs} 0 0;
      font-size: ${fontSizeS};
      line-height: 1.35;
      color: ${isDark ? '#a1a1aa' : '#71717a'};
    }

    .pocToastCardBodyClamped {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }

    .pocToastCardReadMore {
      display: inline-block;
      margin-top: ${euiTheme.size.xxs};
      font-size: ${fontSizeS};
      line-height: 1.35;
    }

    .pocToastCardCta {
      margin-top: ${euiTheme.size.s};
    }

    .pocToastCardActions {
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xxs};
      flex-shrink: 0;
      margin-top: -${euiTheme.size.xxs};
    }
  `;
};

/** Utility pill — Tailwind zinc/red spec translated to Emotion tokens */
export const pocToastClearAllButtonStyles = ({ euiTheme, colorMode }: UseEuiTheme) => {
  const isDark = colorMode === 'DARK';

  return css`
    display: block;
    margin: 0 auto;
    padding: 6px 12px;
    border: 1px solid ${isDark ? 'rgba(63, 63, 70, 0.5)' : 'rgba(228, 228, 231, 0.5)'};
    border-radius: 9999px;
    background: ${isDark ? 'rgba(39, 39, 42, 0.85)' : 'rgba(244, 244, 245, 0.8)'};
    backdrop-filter: blur(4px);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: ${euiTheme.font.weight.semiBold};
    letter-spacing: 0.025em;
    color: ${isDark ? '#71717a' : '#a1a1aa'};
    transition: color 150ms ease, background-color 150ms ease, border-color 150ms ease;

    &:hover {
      color: ${isDark ? '#f87171' : '#ef4444'};
      background: ${isDark ? 'rgba(69, 10, 10, 0.3)' : 'rgba(254, 242, 242, 1)'};
      border-color: ${isDark ? 'rgba(127, 29, 29, 0.4)' : 'rgba(254, 202, 202, 0.6)'};
    }

    &:focus-visible {
      outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
      outline-offset: 2px;
    }
  `;
};
