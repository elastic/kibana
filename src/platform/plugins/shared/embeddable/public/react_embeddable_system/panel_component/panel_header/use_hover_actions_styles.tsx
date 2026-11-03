/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme, highContrastModeStyles, euiShadow, euiCanAnimate } from '@elastic/eui';
import { css } from '@emotion/react';

import { useMemo } from 'react';

// POC: same duration math as euiPopoverPanelStyles (slow + 100ms on the transform).
const addMilliseconds = (duration: string | number | undefined, extraMs: number): string => {
  if (typeof duration === 'number') return `${duration + extraMs}ms`;
  const match = duration ? /^([\d.]+)(ms|s)$/.exec(duration.trim()) : null;
  if (!match) return `${extraMs}ms`;
  const value = Number(match[1]);
  return match[2] === 'ms' ? `${value + extraMs}ms` : `${value + extraMs / 1000}s`;
};

export const useHoverActionStyles = (isEditMode: boolean, showBorder?: boolean) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  const hoverActionStyles = useMemo(() => {
    const singleWrapperStyles = css`
      width: fit-content;
      top: -${euiTheme.size.l} !important;
      right: ${euiTheme.size.xs};
      padding: var(--paddingAroundAction);

      border-radius: ${euiTheme.border.radius.control};
      border: var(--internalBorderStyle);
      border-width: ${euiTheme.border.width
        .thin}; /* Prevents the element from resizing when dragged by keeping the border width constant (overriding the default change from 1px to 2px) */
      box-shadow: var(
        --hoverActionsSingleWrapperBoxShadowStyle
      ); /* Simulates a 2px border without affecting layout by using a box-shadow */
      background-color: ${euiTheme.colors.backgroundBasePlain};
      grid-template-columns: max-content;

      & > * {
        // undo certain styles on all children so that parent takes precedence
        border: none !important;
        box-shadow: none !important;
        padding: 0px !important;
        border-radius: unset !important;
        background-color: transparent !important;
        height: unset !important;
      }
    `;

    return css`
      .embPanel__hoverActions {
        --paddingAroundAction: calc(${euiTheme.size.xs} - 1px);

        pointer-events: none; // prevent hover actions wrapper from blocking interactions with other panels

        width: 100%;
        height: ${euiTheme.size.xl};
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0px ${euiTheme.size.m};

        & > * {
          // apply styles to all children
          display: flex;
          height: ${euiTheme.size.xl};
          flex: 0; // do not grow
          pointer-events: all; // re-enable pointer events for non-breakpoint children
          background-color: ${euiTheme.colors.backgroundBasePlain};
          ${euiShadow(euiThemeContext, 'xs')}
          padding: var(--paddingAroundAction);
          border-radius: ${euiTheme.border.radius.control};
        }

        // shrink down to single wrapped element with no breakpoint when panel gets small
        @container hoverActionsAnchor (width < 200px) {
          ${singleWrapperStyles}
        }

        // when Dashboard is in fullscreen mode, combine all floating actions on first row and nudge them down;
        // if the panel is **not** on the first row but it is expanded in fullscreen mode, do the same thing
        .dshDashboardViewportWrapper--isFullscreen .dshDashboardGrid__item[data-grid-row='0'] &,
        .dshDashboardViewportWrapper--isFullscreen .kbnGridPanel--expanded & {
          ${singleWrapperStyles}
          top: -${euiTheme.size.s} !important;
        }
      }
    `;
  }, [euiTheme, euiThemeContext]);

  const containerStyles = useMemo(() => {
    const editModeOutline = `${euiTheme.border.width.thin} dashed ${euiTheme.colors.borderBaseProminent}`;
    const viewModeOutline = `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`;
    // POC: one speed token faster than EuiPopover (`slow`), transform still 100ms longer.
    const popoverSpeed = euiTheme.animation.normal;
    const popoverTransformSpeed = addMilliseconds(popoverSpeed, 100);

    return css`
      // the border style can be overwritten by parents who define --hoverActionsBorderStyle; otherwise, default to either
      // editModeOutline or viewModeOutline depending on view mode
      --internalBorderStyle: var(
        --hoverActionsBorderStyle,
        ${isEditMode ? editModeOutline : viewModeOutline}
      );

      display: inline-block;
      container: hoverActionsAnchor / inline-size;
      border-radius: ${euiTheme.border.radius.control};
      position: relative;
      vertical-align: top;
      width: 100%;
      height: 100%;

      ${showBorder
        ? css`
            .embPanel {
              outline: var(--internalBorderStyle);

              ${highContrastModeStyles(euiThemeContext, {
                preferred: `
                  border: none;
                `,
              })},
            }
          `
        : css`
            .embPanel {
              outline: var(--internalBorderStyle); // necessary for outline-color transition
              outline-color: transparent; // necessary for outline-color transition
              z-index: ${euiTheme.levels.content}; // necessary for z-index transition
              // delay hiding border on hover out to match delay on hover actions
              transition: outline-color ${euiTheme.animation.extraFast},
                z-index ${euiTheme.animation.extraFast};
              transition-delay: ${euiTheme.animation.fast};
            }

            &:hover {
              .embPanel {
                z-index: ${euiTheme.levels.menu};
                transition: none; // apply transition on hover out only

                ${highContrastModeStyles(euiThemeContext, {
                  none: `
                    outline: var(--internalBorderStyle);
                  `,
                  preferred: `
                    border: var(--internalBorderStyle);
                  `,
                })},
              }
            }
          `}

      ${hoverActionStyles};

      .embPanel__hoverActions {
        position: absolute;
        top: -${euiTheme.size.l};
        z-index: -1;
        opacity: 0;
        visibility: hidden;
        /* POC: half the EuiPopover offset (size.s is 8px). */
        transform: translateY(${euiTheme.size.xs});

        /* POC: EuiPopover panel — opacity and transform, bounce, both directions.
           Transform runs 100ms longer than opacity. Visibility waits out the exit. */
        ${euiCanAnimate} {
          transition: opacity ${euiTheme.animation.bounce} ${popoverSpeed},
            transform ${euiTheme.animation.bounce} ${popoverTransformSpeed},
            visibility 0s linear ${popoverTransformSpeed}, z-index 0s linear ${popoverTransformSpeed};
        }
      }

      &:hover .embPanel__hoverActions,
      &:has(:focus-visible) .embPanel__hoverActions,
      &.embPanel__hoverActionsAnchor--lockHoverActions .embPanel__hoverActions,
      .embPanel__hoverActions:hover,
      .embPanel__hoverActions:has(:focus-visible) {
        z-index: ${euiTheme.levels.menu};
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
        ${euiCanAnimate} {
          transition: opacity ${euiTheme.animation.bounce} ${popoverSpeed},
            transform ${euiTheme.animation.bounce} ${popoverTransformSpeed}, visibility 0s linear 0s,
            z-index 0s linear 0s;
        }
        // when the panel is in fullscreen mode, increase the z-index of the hover actions to be above the sticky nav
        .kbnGridPanel--expanded & {
          z-index: ${euiTheme.levels.toast};
        }
      }
    `;
  }, [euiTheme, showBorder, isEditMode, euiThemeContext, hoverActionStyles]);

  return containerStyles;
};
