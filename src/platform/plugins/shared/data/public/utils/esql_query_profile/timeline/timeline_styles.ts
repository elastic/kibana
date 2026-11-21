/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiFontSize, useEuiTheme } from '@elastic/eui';

export const useTimelineStyles = () => {
  const { euiTheme } = useEuiTheme();
  const { fontSize: small } = useEuiFontSize('xs');
  const labelColumn = `minmax(${euiTheme.base * 8}px, ${euiTheme.base * 12}px) 1fr`;

  return useMemo(() => {
    // Groups of drivers are told apart by their place, so no kind of driver needs a color of its own.
    const { euiColorVis3, euiColorVis5, euiColorVis7, euiColorVis9, euiColorVis1 } =
      euiTheme.colors.vis;
    const groupColors = [
      euiTheme.colors.primary,
      euiColorVis3,
      euiColorVis5,
      euiColorVis7,
      euiColorVis9,
      euiColorVis1,
    ];

    return {
      lanes: css`
        max-height: ${euiTheme.base * 22}px;
        overflow-y: auto;
        /*
         * A view that stops a few pixels from the top would leave the first row half under the ruler,
         * so near the top it settles at the top. The padding is the height of the ruler, which is
         * where the first row starts.
         */
        scroll-snap-type: y proximity;
        scroll-padding-top: calc(${euiTheme.size.base} + 2 * ${euiTheme.size.xs});
        /* The ruler's z-index stays inside the lanes, so it does not compete with anything outside. */
        isolation: isolate;
      `,
      snapToTop: css`
        scroll-snap-align: start;
      `,
      ruler: css`
        position: sticky;
        top: 0;
        /* Above the bars, which are positioned too and would otherwise draw over the ruler. */
        z-index: ${euiTheme.levels.menu};
        display: grid;
        grid-template-columns: ${labelColumn};
        gap: ${euiTheme.size.s};
        padding: ${euiTheme.size.xs};
        background: ${euiTheme.colors.backgroundBasePlain};

        /*
       * Once the lanes have scrolled, rows fade out under the ruler, so a row that is half scrolled
       * away is not cut at its line. At rest there is nothing under the ruler to fade.
       */
        &::after {
          content: '';
          position: absolute;
          inset-inline: 0;
          top: 100%;
          height: ${euiTheme.size.base};
          background: linear-gradient(${euiTheme.colors.backgroundBasePlain}, transparent);
          opacity: 0;
          pointer-events: none;
          transition: opacity ${euiTheme.animation.fast} ease-in;
        }

        [data-scrolled='true'] > &::after {
          opacity: 1;
        }
      `,
      rulerTrack: css`
        position: relative;
        height: ${euiTheme.size.base};
        border-bottom: ${euiTheme.border.thin};
      `,
      rulerTick: css`
        position: absolute;
        top: 0;
        color: ${euiTheme.colors.textSubdued};
        font-size: ${small};
        font-variant-numeric: tabular-nums;
        line-height: 1.4;
        white-space: nowrap;
      `,
      lane: css`
        display: grid;
        grid-template-columns: ${labelColumn};
        align-items: center;
        gap: ${euiTheme.size.s};
        width: 100%;
        margin-bottom: ${euiTheme.size.xs};
        padding: ${euiTheme.size.xs};
        text-align: start;
        color: inherit;
        background: transparent;
        border: none;
        border-radius: ${euiTheme.border.radius.medium};
        cursor: pointer;

        &:hover,
        &[aria-pressed='true'] {
          background: ${euiTheme.colors.backgroundBaseInteractiveHover};
        }
      `,
      laneLabel: css`
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: ${euiTheme.size.s};
        min-width: 0;
        font-size: ${small};
        line-height: 1.4;
      `,
      laneName: css`
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      `,
      laneTime: css`
        flex-shrink: 0;
        color: ${euiTheme.colors.textSubdued};
        font-variant-numeric: tabular-nums;
      `,
      laneTrack: css`
        position: relative;
        height: ${euiTheme.size.m};
        overflow: hidden;
        background: ${euiTheme.colors.backgroundBaseFormsControlDisabled};
        border-radius: ${euiTheme.border.radius.medium};
      `,
      laneBar: css`
        position: absolute;
        top: 0;
        bottom: 0;
      `,
      laneBarSelected: css`
        box-shadow: inset 0 0 0 2px ${euiTheme.colors.text};
      `,
      laneWait: css`
        position: absolute;
        top: 0;
        bottom: 0;
        opacity: 0.85;
        pointer-events: none;
        background: repeating-linear-gradient(
          135deg,
          ${euiTheme.colors.backgroundBasePlain},
          ${euiTheme.colors.backgroundBasePlain} 3px,
          transparent 3px,
          transparent 6px
        );
      `,
      waitSwatch: css`
        /* Stripes and an outline in the text color, because the shades are too close to the page in dark mode. */
        display: inline-block;
        width: ${euiTheme.size.s};
        height: ${euiTheme.size.s};
        border-radius: ${euiTheme.border.radius.small};
        box-sizing: border-box;
        border: 1px solid ${euiTheme.colors.textSubdued};
        background: repeating-linear-gradient(
          135deg,
          ${euiTheme.colors.textSubdued},
          ${euiTheme.colors.textSubdued} 1px,
          ${euiTheme.colors.backgroundBasePlain} 1px,
          ${euiTheme.colors.backgroundBasePlain} 3px
        );
      `,
      planningColor: css`
        background: ${euiTheme.colors.warning};
      `,
      groupColor: (groupIndex: number) =>
        css`
          background: ${groupColors[groupIndex % groupColors.length]};
        `,
    };
  }, [euiTheme, small, labelColumn]);
};
