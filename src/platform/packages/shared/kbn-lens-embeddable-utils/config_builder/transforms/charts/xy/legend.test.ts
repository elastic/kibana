/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { XYState } from '../../../schema';
import { convertLegendToAPIFormat, convertLegendToStateFormat } from './legend';
import { LegendLayout } from '@kbn/chart-expressions-common';

describe('XY Legend Transforms', () => {
  type ApiLegend = NonNullable<XYState['legend']>;
  type StateLegend = ReturnType<typeof convertLegendToStateFormat>['legend'];

  const roundTripLegend = (apiLegend: ApiLegend) => {
    const { legend: stateLegend } = convertLegendToStateFormat(apiLegend);
    const apiResult = convertLegendToAPIFormat(stateLegend) as { legend?: ApiLegend };
    if (!apiResult.legend) {
      throw new Error('Expected legend to be returned from convertLegendToAPIFormat');
    }
    return { stateLegend, apiLegend: apiResult.legend };
  };

  interface LegendCase {
    readonly title: string;
    readonly api: ApiLegend;
    readonly state: Partial<StateLegend>;
    readonly forbiddenApiPaths?: readonly string[];
  }

  const cases: readonly LegendCase[] = [
    {
      title: 'outside bottom list legend persists truncate.max_pixels',
      api: {
        visibility: 'visible',
        placement: 'outside',
        position: 'bottom',
        layout: { type: 'list', truncate: { max_pixels: 320 } },
      },
      state: {
        isVisible: true,
        shouldTruncate: true,
        position: 'bottom',
        layout: LegendLayout.List,
        maxPixels: 320,
      },
      forbiddenApiPaths: ['layout.truncate.max_lines'],
    },
    {
      title: 'outside top list legend persists truncate.max_pixels',
      api: {
        visibility: 'visible',
        placement: 'outside',
        position: 'top',
        layout: { type: 'list', truncate: { max_pixels: 280 } },
      },
      state: {
        isVisible: true,
        shouldTruncate: true,
        position: 'top',
        layout: LegendLayout.List,
        maxPixels: 280,
      },
      forbiddenApiPaths: ['layout.truncate.max_lines'],
    },
    {
      title: 'outside right grid legend persists truncate.max_lines (no max_pixels)',
      api: {
        visibility: 'visible',
        placement: 'outside',
        position: 'right',
        layout: { type: 'grid', truncate: { max_lines: 2 } },
      },
      state: {
        isVisible: true,
        position: 'right',
        shouldTruncate: true,
        maxLines: 2,
      },
      forbiddenApiPaths: ['layout.truncate.max_pixels'],
    },
    {
      title: 'outside left grid legend persists truncate.max_lines (no max_pixels)',
      api: {
        visibility: 'visible',
        placement: 'outside',
        position: 'left',
        layout: { type: 'grid', truncate: { max_lines: 3 } },
      },
      state: {
        isVisible: true,
        position: 'left',
        shouldTruncate: true,
        maxLines: 3,
      },
      forbiddenApiPaths: ['layout.truncate.max_pixels'],
    },
  ];

  it.each(cases)('$title (API -> State -> API)', ({ api, state, forbiddenApiPaths }) => {
    const { stateLegend, apiLegend } = roundTripLegend(api);

    expect(stateLegend).toMatchObject(state);

    // API assertions: verify the persisted shape + explicitly forbid the other truncate key.
    expect(apiLegend).toMatchObject(api);
    forbiddenApiPaths?.forEach((path) => {
      expect(apiLegend).not.toHaveProperty(path);
    });
  });
});
