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

      --dashboardHoverActionsActivePanelBoxShadow--singleWrapper: 0 0 0
        ${euiTheme.border.width.thin} ${euiTheme.colors.vis.euiColorVis0};

      --dashboardHoverActionsActivePanelBoxShadow: -${euiTheme.border.width.thin} 0 ${euiTheme.colors.vis.euiColorVis0},
        ${euiTheme.border.width.thin} 0 ${euiTheme.colors.vis.euiColorVis0},
        0 -${euiTheme.border.width.thin} ${euiTheme.colors.vis.euiColorVis0};

      .kbnGridSection--targeted {
        background-position: top calc((var(--kbnGridGutterSize) / 2) * -1px) left
          calc((var(--kbnGridGutterSize) / 2) * -1px);
        background-size: calc((var(--kbnGridColumnWidth) + var(--kbnGridGutterSize)) * 1px)
          calc((var(--kbnGridRowHeight) + var(--kbnGridGutterSize)) * 1px);
        background-image: ${getRadialGradient('top left')}, ${getRadialGradient('top right')},
          ${getRadialGradient('bottom left')}, ${getRadialGradient('bottom right')};
        background-origin: content-box;
      }

      // styles for the area where the panel and/or section header will be dropped
      .kbnGridPanel--dragPreview,
      .kbnGridSection--dragPreview {
        border-radius: ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium};

        background-color: ${transparentize(euiTheme.colors.vis.euiColorVis0, 0.2)};
      }

      // allows embeddables (specifically the control embeddables in this case) to hide the drag handle icon
      .kbnGridPanel:has(.kbnGridLayout--hideDragHandle) {
        .kbnGridPanel--resizeHandle::after {
          display: none !important;
        }
      }

      .kbnGridPanel:hover .kbnGridPanel--resizeHandle {
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

          background-color: ${euiTheme.colors.borderBaseProminent};
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
        --hoverActionsBoxShadowStyle: var(--dashboardHoverActionsActivePanelBoxShadow);
        --hoverActionsSingleWrapperBoxShadowStyle: var(
          --dashboardHoverActionsActivePanelBoxShadow--singleWrapper
        );

        // prevent the hover actions transition when active to prevent "blip" on resize
        .embPanel__hoverActions {
          transition: none;
        }
      }

      // styling for what the grid section header looks like when being dragged
      .kbnGridSectionHeader--active {
        background-color: ${euiTheme.colors.backgroundBasePlain};
        outline: var(--dashboardActivePanelBorderStyle);
        border-radius: ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium};
        padding-left: 8px;
        // hide accordian arrow + panel count text when row is being dragged
        & .kbnGridSectionTitle--button svg,
        & .kbnGridLayout--panelCount {
          display: none;
        }
      }

      // styling for the section footer
      .kbnGridSectionFooter {
        height: ${euiTheme.size.s};
        display: block;
        border-top: ${euiTheme.border.thin};
        // highlight the footer of a targeted section to make it clear where the section ends
        &--targeted {
          border-top: ${euiTheme.border.width.thick} solid
            ${transparentize(euiTheme.colors.vis.euiColorVis0, 0.5)};
        }
      }
      // hide footer border when section is being dragged
      &:has(.kbnGridSectionHeader--active) .kbnGridSectionHeader--active + .kbnGridSectionFooter {
        border-top: none;
      }

      // apply a "fade out" effect when dragging a section header over another section, indicating that dropping is not allowed
      .kbnGridSection--blocked {
        z-index: 1;
        background-color: ${transparentize(euiTheme.colors.backgroundBaseSubdued, 0.5)};
        // the oulines of panels extend past 100% by 1px on each side, so adjust for that
        margin-left: -1px;
        margin-top: -1px;
        width: calc(100% + 2px);
        height: calc(100% + 2px);
      }

      &:has(.kbnGridSection--blocked) .kbnGridSection--dragHandle {
        cursor: not-allowed !important;
      }
    `;
  }, [euiTheme]);

  return layoutStyles;
};
