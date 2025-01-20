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

        // delay hiding hover actions to make grabbing the drag handle easier
        transition: ${euiTheme.animation.extraFast} opacity ease-in,
          ${euiTheme.animation.extraFast} z-index linear;
        transition-delay: ${euiTheme.animation.normal};
      }

      &:hover .embPanel__hoverActions,
      &:focus .embPanel__hoverActions,
      &:focus-within .embPanel__hoverActions,
      &.embPanel__hoverActionsAnchor--lockHoverActions .embPanel__hoverActions,
      .embPanel__hoverActions:hover,
      .embPanel__hoverActions:focus {
        z-index: ${euiTheme.levels.toast};
        opacity: 1;
        transition: none; // apply transition on hover out only
      }
    `;
  }, [euiTheme]);

  const hoverActionStyles = useMemo(() => {
    return css`
      --paddingAroundAction: calc(${euiTheme.size.xs} - 1px);

      pointer-events: none; // prevent hover actions wrapper from blocking interactions with other panels

      height: ${euiTheme.size.xl};
      padding: 0px ${euiTheme.size.m};
      width: 100%;

      display: grid;
      grid-template-columns: max-content auto; // left actions + breakpoint
      grid-auto-columns: max-content; // handle all right actions
      grid-auto-flow: column;
      align-items: center;

      & > * {
        pointer-events: all; // re-enable pointer events for children
        height: ${euiTheme.size.xl};

        &:not(.breakpoint) {
          // style children that are **not** the breakpoint
          border-top: var(--borderStyle);
          border-radius: 0px;
          background-color: ${euiTheme.colors.backgroundBasePlain};
          padding: var(--paddingAroundAction) 0px;
        }
      }

      // start of action group
      & > *:first-child,
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
        width: fit-content;
        top: -${euiTheme.size.l};
        right: ${euiTheme.size.xs};
        padding: var(--paddingAroundAction);

        border-radius: ${euiTheme.border.radius.medium};
        border: var(--borderStyle);
        background-color: ${euiTheme.colors.backgroundBasePlain};
        grid-template-columns: max-content;

        & > * {
          border: none !important;
          padding: 0px !important;
        }
      }
    `;
  }, [euiTheme]);

  return { containerStyles, hoverActionStyles };
};
