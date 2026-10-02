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
import type { PocToastType } from './poc_toast_types';
import {
  POC_TOAST_MAX_CARD_WIDTH,
  POC_TOAST_STACK_GAP,
  getPocToastPointerEventsEnabled,
} from './poc_toast_motion';

const POC_TOAST_SCROLL_SHADOW_ROOM = 16;

export const getPocToastMotionColumnClassName = (isExpanded: boolean) =>
  emotionClassName`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: ${isExpanded ? `${POC_TOAST_STACK_GAP}px` : '0'};
    ${isExpanded
      ? `
      max-height: calc(100vh - ${POC_TOAST_SCROLL_SHADOW_ROOM * 2}px);
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      /* A visible scrollbar would steal width from the cards and make them rewrap. */
      scrollbar-width: none;
      &::-webkit-scrollbar {
        display: none;
      }
      /* Padding keeps card shadows from being clipped by the scroll container.
         content-box keeps it outside the fixed stack width so cards don't shrink on expand. */
      box-sizing: content-box;
      padding: ${POC_TOAST_SCROLL_SHADOW_ROOM}px;
      margin: -${POC_TOAST_SCROLL_SHADOW_ROOM}px;
    `
      : ''}
  `;

/** Body longer than this shows a “Read more” control (collapsed uses line clamp). */
export const POC_TOAST_BODY_MAX_CHARS_BEFORE_EXPAND = 120;

export const pocToastBodyClampClassName = emotionClassName`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
`;

export const getPocToastMotionColumnWidthClassName = (stackWidth: number | undefined) =>
  emotionClassName`
    width: ${stackWidth !== undefined ? `${stackWidth}px` : 'max-content'};
    max-width: 100%;
  `;

export const getPocToastMotionCardLayoutClassName = (index: number, isHovered: boolean) =>
  emotionClassName`
    position: ${isHovered || index === 0 ? 'relative' : 'absolute'};
    top: 0;
    left: 0;
    width: 100%;
    flex-shrink: 0;
    transform-origin: bottom center;
  `;

export const getPocToastMotionCardInteractionClassName = (
  index: number,
  isHovered: boolean
) =>
  emotionClassName`
    pointer-events: ${getPocToastPointerEventsEnabled(index, isHovered) ? 'auto' : 'none'};
  `;

export const getPocToastStackInteractionClassName = (
  hasStackContent: boolean,
  paddingBottom: number,
  isExpanded: boolean
) =>
  emotionClassName`
    padding-bottom: ${isExpanded ? '0' : `${paddingBottom}px`};
    pointer-events: ${hasStackContent ? 'auto' : 'none'};
  `;

export const getPocToastClearAllMotionClassName = () =>
  emotionClassName`
    position: sticky;
    bottom: 0;
    /* Cards get z-index up to the stack size via motion, so this must stay above them. */
    z-index: 10000;
    width: 100%;
    flex-shrink: 0;
  `;

export const pocToastAnchorStyles = (euiTheme: UseEuiTheme) => css`
  position: fixed;
  top: 16px;
  left: calc(
    var(--kbn-layout--navigation-width, 0px) +
      (
        100vw - var(--kbn-layout--navigation-width, 0px) -
          var(--kbn-layout--sidebar-width, 0px)
      ) / 2
  );
  transform: translateX(-50%);
  z-index: ${Number(euiTheme.euiTheme.levels.toast ?? 9000) + 1};
  display: flex;
  flex-direction: column;
  align-items: center;
  width: max-content;
  max-width: min(
    calc(
      100vw - var(--kbn-layout--navigation-width, 0px) - var(--kbn-layout--sidebar-width, 0px) -
        ${euiTheme.euiTheme.size.l}
    ),
    ${POC_TOAST_MAX_CARD_WIDTH}px
  );
  pointer-events: none;
`;

export const pocToastStackColumnStyles = css`
  position: relative;
  width: max-content;
  max-width: 100%;
`;

export const pocToastStackStyles = css`
  position: relative;
  width: max-content;
  max-width: 100%;
  pointer-events: auto;
`;

export const pocToastCardMeasureHiddenStyles = css`
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  visibility: hidden;
  pointer-events: none;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  overflow: hidden;
`;

export const pocToastCardPeekStyles = ({ euiTheme, colorMode }: UseEuiTheme) => {
  const isDark = colorMode === 'DARK';

  return css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.m};
    width: 100%;
    min-width: 0;

    .pocToastCardIcon {
      flex-shrink: 0;
      line-height: 0;
    }

    .pocToastCardTitle {
      margin: 0;
      flex: 1;
      min-width: 0;
      font-size: 0.875rem;
      font-weight: ${euiTheme.font.weight.medium};
      line-height: 1.35;
      color: ${isDark ? '#f4f4f5' : '#18181b'};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `;
};

const pocToastGradientSettle = keyframes`
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
  useSolidBackground: boolean,
  isPeekCard: boolean,
  expandedStackWidth: number | undefined
) => {
  const isDark = colorMode === 'DARK';
  const tintByType: Record<PocToastType, string> = {
    info: euiTheme.colors.backgroundLightPrimary,
    warning: euiTheme.colors.backgroundLightWarning,
    error: euiTheme.colors.backgroundLightDanger,
  };
  const typeGradient = `linear-gradient(to top left, ${tintByType[toastType]} 0%, ${euiTheme.colors.backgroundBasePlain} 50%)`;
  const glassFill = isDark ? 'rgba(24, 24, 27, 0.9)' : 'rgba(255, 255, 255, 0.9)';
  const solidFill = isDark ? '#18181b' : '#ffffff';
  const glassHighlight = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.9)';
  const glassBorder = `linear-gradient(135deg, ${glassHighlight} 0%, ${euiTheme.colors.borderBaseSubdued} 45%, ${euiTheme.colors.borderBaseSubdued} 70%, ${glassHighlight} 100%)`;
  const shadow = isDark
    ? '0 2px 6px rgba(0, 0, 0, 0.2), 0 0 24px rgba(0, 0, 0, 0.3)'
    : '0 2px 6px rgba(0, 0, 0, 0.04), 0 0 24px rgba(0, 0, 0, 0.08)';
  const innerHighlight = `inset 0 1px 0 ${glassHighlight}`;

  const widthStyles = `
      width: 100%;
      max-width: ${POC_TOAST_MAX_CARD_WIDTH}px;
    `;

  return css`
    box-sizing: border-box;
    ${widthStyles}
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: ${euiTheme.size.m};
    padding: ${euiTheme.size.m} ${euiTheme.size.m};
    border-radius: ${euiTheme.size.m};
    background:
      ${typeGradient} padding-box,
      linear-gradient(${useSolidBackground ? solidFill : glassFill}, ${useSolidBackground ? solidFill : glassFill}) padding-box,
      ${glassBorder} border-box;
    background-size: 200% 200%, auto, auto;
    background-position: 0% 0%, 0 0, 0 0;
    background-repeat: no-repeat;
    animation: ${pocToastGradientSettle} 900ms ease-out 600ms both;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
    ${useSolidBackground
      ? ''
      : `
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    `}
    border: 1px solid transparent;
    box-shadow: ${innerHighlight}, ${shadow};
    transform-origin: top center;
    will-change: transform, opacity;
    position: relative;
    ${isPeekCard
      ? `
      height: 100%;
      min-height: 0;
      overflow: hidden;
      align-items: center;
    `
      : `
      height: auto;
      overflow: visible;
    `}

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

    .pocToastCardCopy {
      min-width: 0;
    }

    .pocToastCardTitle {
      margin: 0;
      font-size: 0.875rem;
      font-weight: ${euiTheme.font.weight.medium};
      line-height: 1.35;
      color: ${isDark ? '#f4f4f5' : '#18181b'};
    }

    .pocToastCardBody {
      margin: ${euiTheme.size.xxs} 0 0;
      font-size: 0.8125rem;
      line-height: 1.35;
      color: ${isDark ? '#a1a1aa' : '#71717a'};
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

export const pocToastReadMoreLinkStyles = ({ euiTheme }: UseEuiTheme) => css`
  display: inline-block;
  margin-top: ${euiTheme.size.xxs};
  font-size: 0.8125rem;
  line-height: 1.35;
`;

export const pocToastCtaRowStyles = ({ euiTheme }: UseEuiTheme) => css`
  margin-top: ${euiTheme.size.s};
`;

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
    -webkit-backdrop-filter: blur(4px);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: ${euiTheme.font.weight.semiBold};
    letter-spacing: 0.025em;
    text-transform: none;
    color: ${isDark ? '#71717a' : '#a1a1aa'};
    transition:
      color 150ms ease,
      background-color 150ms ease,
      border-color 150ms ease,
      box-shadow 150ms ease;

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
