/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StoryFn } from '@storybook/react';
import React from 'react';
import { euiPaletteColorBlind } from '@elastic/eui';
import { Sparkline } from '.';
import type { SparklinePoint } from './utils';

export default {
  title: 'shared/Sparkline',
  component: Sparkline,
};

const palette = euiPaletteColorBlind({ rotations: 2 });

const now = Date.now();
const minute = 60 * 1000;

function makeSeries(fn: (i: number) => number | null): SparklinePoint[] {
  return Array.from({ length: 20 }, (_, i) => ({
    x: now - (20 - i) * minute,
    y: fn(i),
  }));
}

const latencySeries = makeSeries((i) => 200 + Math.sin(i / 3) * 80 + Math.random() * 30);
const latencyComparisonSeries = makeSeries((i) => 250 + Math.sin(i / 3) * 60 + Math.random() * 20);

const seriesWithGaps = makeSeries((i) => (i >= 7 && i <= 10 ? null : 150 + Math.random() * 50));

export const Line: StoryFn = () => <Sparkline color={palette[2]} series={latencySeries} />;

export const WithComparison: StoryFn = () => (
  <Sparkline
    color={palette[2]}
    series={latencySeries}
    comparisonSeries={latencyComparisonSeries}
    comparisonSeriesColor={palette[12]}
  />
);

export const WithGaps: StoryFn = () => <Sparkline color={palette[6]} series={seriesWithGaps} />;

export const WithGapsAndComparison: StoryFn = () => (
  <Sparkline
    color={palette[6]}
    series={seriesWithGaps}
    comparisonSeries={latencyComparisonSeries}
    comparisonSeriesColor={palette[16]}
  />
);

export const Loading: StoryFn = () => (
  <Sparkline color={palette[2]} series={latencySeries} isLoading />
);

export const NoData: StoryFn = () => <Sparkline color={palette[2]} series={null} />;
