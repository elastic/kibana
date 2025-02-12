/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transparentize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { useMemo } from 'react';

export const useLayoutStyles = () => {
  const { euiTheme } = useEuiTheme();

  const layoutStyles = useMemo(() => {
    const getRadialGradient = (position: string) => {
      return `radial-gradient(
                circle at ${position},
                ${euiTheme.colors.accentSecondary} 1px,
                transparent 1px
              )`;
    };

    /**
     * TODO: We are currently using `euiTheme.colors.vis.euiColorVis0` for grid layout styles because it
     * is the best choice available; however, once https://github.com/elastic/platform-ux-team/issues/586
     * is resolved, we should swap these out for the drag-specific colour tokens
     */
    return css`
      --dashboardActivePanelBorderStyle: ${euiTheme.border.width.thick} solid
        ${euiTheme.colors.vis.euiColorVis0};

      &.kbnGrid {
        // remove margin top + bottom on grid in favour of padding in row
        padding-bottom: 0px;
      }

      .kbnGridRow {
        // use padding in grid row so that dotted grid is not cut off
        padding-bottom: calc(var(--kbnGridGutterSize) * 1px);

        &--targeted {
          background-position: top calc((var(--kbnGridGutterSize) / 2) * -1px) left
            calc((var(--kbnGridGutterSize) / 2) * -1px);
          background-size: calc((var(--kbnGridColumnWidth) + var(--kbnGridGutterSize)) * 1px)
            calc((var(--kbnGridRowHeight) + var(--kbnGridGutterSize)) * 1px);
          background-image: ${getRadialGradient('top left')}, ${getRadialGradient('top right')},
            ${getRadialGradient('bottom left')}, ${getRadialGradient('bottom right')};
          background-origin: content-box;
        }
      }

      .kbnGridPanel--dragPreview {
        background-color: ${transparentize(euiTheme.colors.vis.euiColorVis0, 0.2)};
      }

      .kbnGridPanel--resizeHandle {
        z-index: ${euiTheme.levels.maskBelowHeader};

        // applying mask via ::after allows for focus borders to show
        &:after {
          display: block;
          width: 100%;
          height: 100%;
          content: '';

          mask-repeat: no-repeat;
          mask-position: bottom ${euiTheme.size.s} right ${euiTheme.size.s};
          mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cg clip-path='url(%23clip0_472_172810)'%3E%3Ccircle cx='7' cy='1' r='1' fill='%23000000'/%3E%3C/g%3E%3Cg clip-path='url(%23clip1_472_172810)'%3E%3Ccircle cx='4' cy='4' r='1' fill='%23000000'/%3E%3Ccircle cx='7' cy='4' r='1' fill='%23000000'/%3E%3C/g%3E%3Cg clip-path='url(%23clip2_472_172810)'%3E%3Ccircle cx='1' cy='7' r='1' fill='%23000000'/%3E%3Ccircle cx='4' cy='7' r='1' fill='%23000000'/%3E%3Ccircle cx='7' cy='7' r='1' fill='%23000000'/%3E%3C/g%3E%3C/svg%3E");

          background-color: ${euiTheme.colors.borderBaseFormsControl};
        }
        &:hover,
        &:focus-visible {
          &:after {
            background-color: ${euiTheme.colors.vis.euiColorVis0};
          }
        }
      }

      .kbnGridPanel--active {
        // overwrite the border style on panels + hover actions for active panels
        --hoverActionsBorderStyle: var(--dashboardActivePanelBorderStyle);

        // prevent the hover actions transition when active to prevent "blip" on resize
        .embPanel__hoverActions {
          transition: none;
        }
      }
    `;
  }, [euiTheme]);

  return layoutStyles;
};
