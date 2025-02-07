/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { useMemo } from 'react';

export const useHoverActionStyles = (isEditMode: boolean, showBorder?: boolean) => {
  const { euiTheme } = useEuiTheme();

  const containerStyles = useMemo(() => {
    const editModeOutline = `${euiTheme.border.width.thin} dashed ${euiTheme.colors.borderBaseFormsControl}`;
    const viewModeOutline = `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`;

    return css`
      // the border style can be overwritten by parents who define --hoverActionsBorderStyle; otherwise, default to either
      // editModeOutline or viewModeOutline depending on view mode
      --internalBorderStyle: var(
        --hoverActionsBorderStyle,
        ${isEditMode ? editModeOutline : viewModeOutline}
      );

      display: inline-block;
      container: hoverActionsAnchor / inline-size;
      border-radius: ${euiTheme.border.radius.medium};
      position: relative;
      vertical-align: top;
      width: 100%;
      height: 100%;

      ${showBorder
        ? css`
            .embPanel {
              outline: var(--internalBorderStyle);
            }
          `
        : css`
            .embPanel {
              outline: 1px solid transparent; // necessary for outline-color transition
              z-index: ${euiTheme.levels.content}; // necessary for z-index transition
              // delay hiding border on hover out to match delay on hover actions
              transition: outline-color ${euiTheme.animation.extraFast},
                z-index ${euiTheme.animation.extraFast};
              transition-delay: ${euiTheme.animation.fast};
            }

            &:hover .embPanel {
              outline: var(--internalBorderStyle);
              z-index: ${euiTheme.levels.menu};
              transition: none; // apply transition on hover out only
            }
          `}

      .embPanel__hoverActions {
        position: absolute;
        top: -${euiTheme.size.xl};
        z-index: -1;
        opacity: 0;
        visibility: hidden;

        // delay hiding hover actions to make grabbing the drag handle easier
        transition: opacity ${euiTheme.animation.extraFast} ease-in,
          z-index ${euiTheme.animation.extraFast} linear,
          visibility ${euiTheme.animation.extraFast} linear;
        transition-delay: ${euiTheme.animation.fast};
      }

      &:hover .embPanel__hoverActions,
      &:has(:focus-visible) .embPanel__hoverActions,
      &.embPanel__hoverActionsAnchor--lockHoverActions .embPanel__hoverActions,
      .embPanel__hoverActions:hover,
      .embPanel__hoverActions:has(:focus-visible) {
        z-index: ${euiTheme.levels.menu};
        opacity: 1;
        visibility: visible;
        transition: none; // apply transition delay on hover out only
      }
    `;
  }, [euiTheme, showBorder, isEditMode]);

  const hoverActionStyles = useMemo(() => {
    const singleWrapperStyles = css`
      width: fit-content;
      top: -${euiTheme.size.l} !important;
      right: ${euiTheme.size.xs};
      padding: var(--paddingAroundAction);

      border-radius: ${euiTheme.border.radius.medium};
      border: var(--internalBorderStyle);
      background-color: ${euiTheme.colors.backgroundBasePlain};
      grid-template-columns: max-content;

      & > * {
        // undo certain styles on all children so that parent takes precedence
        border: none !important;
        padding: 0px !important;
        border-radius: unset !important;
        background-color: transparent !important;
        height: unset !important;
      }
    `;

    return css`
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
        border: var(--internalBorderStyle);
        border-bottom: 0px;
        padding: var(--paddingAroundAction);
        padding-bottom: 0px;
        border-top-left-radius: ${euiTheme.border.radius.medium};
        border-top-right-radius: ${euiTheme.border.radius.medium};
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
    `;
  }, [euiTheme]);

  return { containerStyles, hoverActionStyles };
};
