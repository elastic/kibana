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

export const useHoverActionStyles = () => {
  const { euiTheme } = useEuiTheme();

  const containerStyles = useMemo(() => {
    return css`
      container: hoverActionsAnchor / size;
      border-radius: ${euiTheme.border.radius.medium};
      position: relative;
      height: 100%;

      .embPanel__hoverActions {
        position: absolute;
        top: -${euiTheme.size.xl};
        z-index: -1;
        opacity: 0;
        visibility: hidden;

        // delay hiding hover actions to make grabbing the drag handle easier
        transition: ${euiTheme.animation.extraFast} opacity ease-in,
          ${euiTheme.animation.extraFast} z-index linear,
          ${euiTheme.animation.extraFast} visibility linear;
        transition-delay: ${euiTheme.animation.normal};
      }

      &:hover .embPanel__hoverActions,
      &:focus .embPanel__hoverActions,
      &:has(:focus-visible) .embPanel__hoverActions,
      &.embPanel__hoverActionsAnchor--lockHoverActions .embPanel__hoverActions,
      .embPanel__hoverActions:hover,
      .embPanel__hoverActions:focus,
      .embPanel__hoverActions:has(:focus-visible) {
        z-index: ${euiTheme.levels.menu};
        opacity: 1;
        visibility: visible;
        transition: none; // apply transition delay on hover out only
      }

      // for dashboards with no controls, increase the z-index of the hover actions in the
      // top row so that they overlap the sticky nav in Dashboard
      .dshDashboardViewportWrapper:not(:has(.dshDashboardViewport-controls))
        .dshDashboardGrid__item[data-grid-row='0']
        &
        .embPanel__hoverActions {
        z-index: ${euiTheme.levels.toast};
      }
    `;
  }, [euiTheme]);

  const hoverActionStyles = useMemo(() => {
    const singleWrapperStyles = css`
      width: fit-content;
      top: -${euiTheme.size.l} !important;
      right: ${euiTheme.size.xs};
      padding: var(--paddingAroundAction);

      border-radius: ${euiTheme.border.radius.medium};
      border: var(--borderStyle);
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

      height: ${euiTheme.size.xl};
      padding: 0px ${euiTheme.size.m};
      width: 100%;

      display: flex;
      align-items: center;

      & > * {
        height: ${euiTheme.size.xl};

        &:not(.breakpoint) {
          flex: 0; // do not grow
          pointer-events: all; // re-enable pointer events for non-breakpoint children
          // style children that are **not** the breakpoint
          border-top: var(--borderStyle);
          border-radius: 0px;
          background-color: ${euiTheme.colors.backgroundBasePlain};
          padding: var(--paddingAroundAction) 0px;
        }
      }

      & > .breakpoint {
        flex: 1; // grow to fill remaining space between left and right action groups
      }

      // start of action group
      & > *:first-child:not(.breakpoint),
      & > .breakpoint + * {
        border-left: var(--borderStyle);
        border-top-left-radius: ${euiTheme.border.radius.medium};
        padding-left: var(--paddingAroundAction);
      }

      // end of action group
      & > *:has(+ .breakpoint),
      & > *:last-child {
        border-right: var(--borderStyle);
        border-top-right-radius: ${euiTheme.border.radius.medium};
        padding-right: var(--paddingAroundAction);
      }

      @container hoverActionsAnchor (width < 250px) {
        // shrink down to single wrapped element with no breakpoint when panel gets small
        ${singleWrapperStyles}
      }

      .dshDashboardViewportWrapper--isFullscreen .dshDashboardGrid__item[data-grid-row='0'] & {
        // when in fullscreen mode, combine all floating actions on first row and nudge them down
        ${singleWrapperStyles}
        top: -${euiTheme.size.s} !important;
      }
    `;
  }, [euiTheme]);

  return { containerStyles, hoverActionStyles };
};
