/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useSyncExternalStore, type ReactNode } from 'react';
import type { CSSObject } from '@emotion/react';
import { useGeneratedHtmlId } from '@elastic/eui';
import type { TileInput } from '../../types';
import {
  TREND_BEHIND_VALUE_OPACITY,
  TREND_GRADIENT_STOPS,
  metricTileColors,
  neutralTrendColors,
  type TrendColors,
} from './colors';
import { bTargets } from './targets';

/*
 * This is very hacky: this styling belongs in @elastic/charts, but this is an experiment.
 * It adds gradients and reaches into the chart's DOM to style the trend and the top border.
 */
const TREND_LINE_WIDTH = '1px';
const TREND_LINE_BLEED = '2px';
const TOP_BORDER_WIDTH = '1.5px';

const trendGradientId = (prefix: string, i: number) => `${prefix}-${i}`;

const tileSelector = (i: number) => `.echMetricContainer > li:nth-child(${i + 1})`;

interface TrendOptions {
  gradientPrefix: string;
  showLine: boolean;
  gradient: boolean;
}

const trendStyles = (
  tiles: Array<TrendColors | undefined>,
  { gradientPrefix, showLine, gradient }: TrendOptions
): CSSObject =>
  Object.assign(
    {},
    ...tiles.map((colors, i) => {
      if (!colors) return {};
      const tile = tileSelector(i);
      const area: CSSObject = gradient
        ? { fill: `url(#${trendGradientId(gradientPrefix, i)})` }
        : { fill: colors.trend, fillOpacity: TREND_BEHIND_VALUE_OPACITY };
      const line: CSSObject = showLine
        ? {
            stroke: colors.trendLine,
            strokeWidth: TREND_LINE_WIDTH,
            strokeLinejoin: 'round',
            vectorEffect: 'non-scaling-stroke',
          }
        : { stroke: 'none' };
      return {
        // The line bleeds past the tile's edges, so it isn't cut in half there.
        ...(showLine && {
          [`${tile} .echSingleMetricSparkline__svg`]: {
            inset: `0 -${TREND_LINE_BLEED} -${TREND_LINE_BLEED}`,
            width: `calc(100% + 2 * ${TREND_LINE_BLEED})`,
            height: `calc(100% + ${TREND_LINE_BLEED})`,
          },
        }),
        [`${tile} .echSingleMetricSparkline__svg path`]: { ...area, ...line },
      };
    })
  );

const topBorderStyles = (borders: Array<string | undefined>): CSSObject =>
  Object.assign(
    {},
    ...borders.map((border, i) =>
      border
        ? {
            [`${tileSelector(i)} .echMetric::before`]: {
              content: '""',
              position: 'absolute',
              inset: `0 0 auto`,
              height: TOP_BORDER_WIDTH,
              background: border,
              pointerEvents: 'none',
              zIndex: 1,
            },
          }
        : {}
    )
  );

const TrendGradients = ({
  tiles,
  prefix,
}: {
  tiles: Array<TrendColors | undefined>;
  prefix: string;
}) => (
  <svg width={0} height={0} aria-hidden="true" css={{ position: 'absolute' }}>
    <defs>
      {tiles.map(
        (colors, i) =>
          colors && (
            <linearGradient key={i} id={trendGradientId(prefix, i)} x1={0} y1={1} x2={0} y2={0}>
              {TREND_GRADIENT_STOPS.map(({ offset, opacity }) => (
                <stop key={offset} offset={offset} stopColor={colors.trend} stopOpacity={opacity} />
              ))}
            </linearGradient>
          )
      )}
    </defs>
  </svg>
);

/** Variant B's trend gradients, trend lines and top borders, styled into the chart it wraps. */
export const BDecorations = ({
  tiles,
  children,
}: {
  tiles: ReadonlyArray<TileInput | undefined>;
  children: ReactNode;
}) => {
  const targets = useSyncExternalStore(bTargets.subscribe, bTargets.get);
  const gradientPrefix = useGeneratedHtmlId({ prefix: 'metricTrendGradient' });

  const colors = Array.from(tiles, (tile) =>
    tile && !tile.noColor
      ? metricTileColors(tile.color, tile.mode, {
          ramp: tile.ramp,
          hasTrend: tile.hasTrend,
          targets,
        })
      : undefined
  );
  const trends = colors.map((tileColors, i) => {
    const tile = tiles[i];
    if (!tile?.isBackground) return undefined;
    // A tile with no color or no hue keeps its background and gets a neutral trend.
    return tileColors ?? neutralTrendColors(tile.color, tile.mode, targets);
  });
  const { showTrendLine, trendGradient, topBorder } = targets;
  const borders = colors.map((tileColors) => (topBorder ? tileColors?.border : undefined));

  return (
    <div
      css={[
        { display: 'contents' },
        trendStyles(trends, { gradientPrefix, showLine: showTrendLine, gradient: trendGradient }),
        topBorderStyles(borders),
      ]}
    >
      {trendGradient && <TrendGradients tiles={trends} prefix={gradientPrefix} />}
      {children}
    </div>
  );
};
