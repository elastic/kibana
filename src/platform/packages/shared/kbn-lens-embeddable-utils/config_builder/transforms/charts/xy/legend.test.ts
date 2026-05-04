/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { XYConfig } from '../../../schema';
import { convertLegendToAPIFormat, convertLegendToStateFormat } from './legend';
import type { XYVisualizationState } from '@kbn/lens-common';

describe('XY Legend Transforms', () => {
  type ApiLegend = NonNullable<XYConfig['legend']>;
  type StateLegend = XYVisualizationState['legend'];

  const roundTripLegend = (stateLegend: StateLegend) => {
    const apiResult = convertLegendToAPIFormat(stateLegend) as { legend?: ApiLegend };
    if (!apiResult.legend) {
      throw new Error('Expected legend to be returned from convertLegendToAPIFormat');
    }
    const { legend: nextStateLegend } = convertLegendToStateFormat(apiResult.legend);
    return { stateLegend: nextStateLegend, apiLegend: apiResult.legend };
  };

  interface LegendCase {
    readonly title: string;
    readonly state: StateLegend;
    readonly api: ApiLegend;
    readonly forbiddenApiPaths?: readonly string[];
  }

  const cases: readonly LegendCase[] = [
    {
      title: 'inside grid legend persists truncate.max_lines',
      state: {
        isVisible: true,
        isInside: true,
        position: 'right',
        shouldTruncate: true,
        maxLines: 2,
        verticalAlignment: 'bottom',
        horizontalAlignment: 'left',
        floatingColumns: 2,
      },
      api: {
        visibility: 'visible',
        placement: 'inside',
        columns: 2,
        position: 'bottom_left',
        layout: { type: 'grid', truncate: { max_lines: 2 } },
      },
      forbiddenApiPaths: ['layout.truncate.max_pixels'],
    },
    {
      title: 'outside right grid legend persists truncate.max_lines',
      state: {
        isVisible: true,
        position: 'right',
        shouldTruncate: true,
        maxLines: 2,
      },
      api: {
        visibility: 'visible',
        placement: 'outside',
        position: 'right',
        layout: { type: 'grid', truncate: { max_lines: 2 } },
      },
      forbiddenApiPaths: ['layout.truncate.max_pixels'],
    },
    {
      title: 'outside left grid legend persists default truncate.max_lines = 1',
      state: {
        isVisible: true,
        position: 'left',
        shouldTruncate: true,
      },
      api: {
        visibility: 'visible',
        placement: 'outside',
        position: 'left',
        layout: { type: 'grid', truncate: { max_lines: 1 } },
      },
      forbiddenApiPaths: ['layout.truncate.max_pixels'],
    },
    {
      title: 'series header auto (visible, no custom title)',
      state: {
        isVisible: true,
        position: 'bottom',
        shouldTruncate: true,
        maxLines: 2,
        isTitleVisible: true,
        title: undefined,
      },
      api: {
        visibility: 'visible',
        placement: 'outside',
        position: 'bottom',
        layout: { type: 'grid', truncate: { max_lines: 2 } },
        series_header: { visible: true },
      },
      forbiddenApiPaths: ['layout.truncate.max_pixels'],
    },
    {
      title: 'series header custom title',
      state: {
        isVisible: true,
        position: 'bottom',
        shouldTruncate: true,
        maxLines: 2,
        isTitleVisible: true,
        title: 'My series',
      },
      api: {
        visibility: 'visible',
        placement: 'outside',
        position: 'bottom',
        layout: { type: 'grid', truncate: { max_lines: 2 } },
        series_header: { visible: true, text: 'My series' },
      },
      forbiddenApiPaths: ['layout.truncate.max_pixels'],
    },
    {
      title: 'series header none',
      state: {
        isVisible: true,
        position: 'bottom',
        shouldTruncate: true,
        maxLines: 2,
        isTitleVisible: false,
      },
      api: {
        visibility: 'visible',
        placement: 'outside',
        position: 'bottom',
        layout: { type: 'grid', truncate: { max_lines: 2 } },
        series_header: { visible: false },
      },
      forbiddenApiPaths: ['layout.truncate.max_pixels'],
    },
  ];

  it.each(cases)('$title (State -> API -> State)', ({ api, state, forbiddenApiPaths }) => {
    const { stateLegend, apiLegend } = roundTripLegend(state);

    expect(stateLegend).toMatchObject(state);

    // API assertions: verify the persisted shape + explicitly forbid the other truncate key.
    expect(apiLegend).toMatchObject(api);
    forbiddenApiPaths?.forEach((path) => {
      expect(apiLegend).not.toHaveProperty(path);
    });
  });
});
