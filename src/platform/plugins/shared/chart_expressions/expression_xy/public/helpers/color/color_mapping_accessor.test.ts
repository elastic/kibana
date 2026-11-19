/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { XYChartSeriesIdentifier } from '@elastic/charts';
import { getColorCategories } from '@kbn/chart-expressions-common';
import { DEFAULT_COLOR_MAPPING_CONFIG } from '@kbn/coloring';
import type { RawValue } from '@kbn/data-plugin/common';
import { KbnPalette, getKbnPalettes } from '@kbn/palettes';
import type { DatatableRow } from '@kbn/expressions-plugin/common';
import type { InvertedRawValueMap } from '../data_layers';
import { getColorSeriesAccessorFn } from './color_mapping_accessor';

const createSeriesIdentifier = (agentName: string, ownerLabel: string): XYChartSeriesIdentifier =>
  ({
    key: `${agentName}-${ownerLabel}`,
    specId: 'spec',
    yAccessor: 'metric',
    splitAccessors: new Map([
      ['agent.name', agentName],
      ['aspnetcore.memory_pool.owner', ownerLabel],
    ]),
    seriesKeys: [agentName, ownerLabel],
  } as unknown as XYChartSeriesIdentifier);

describe('getColorSeriesAccessorFn', () => {
  it('uses palette colors for multi-split missing values mapped from formatted null labels', () => {
    const palettes = getKbnPalettes({ name: 'amsterdam', darkMode: false });
    const defaultPaletteColors = palettes
      .get(KbnPalette.Default)
      .colors()
      .map((color) => color.toLowerCase());
    const neutralPaletteColors = palettes
      .get(KbnPalette.Neutral)
      .colors()
      .map((color) => color.toLowerCase());
    const neutralFallbackColor = neutralPaletteColors[1];

    const rows: DatatableRow[] = [
      {
        'agent.name': 'mysql-integrations',
        'beat.stats.libbeat.pipeline.queue.filled.events': 8,
      },
      {
        'agent.name': 'apache-integrations',
        'beat.stats.libbeat.pipeline.queue.filled.events': 6,
      },
    ];

    const invertedRawValueMap: InvertedRawValueMap = new Map<string, Map<string, RawValue>>([
      [
        'agent.name',
        new Map<string, RawValue>([
          ['mysql-integrations', 'mysql-integrations'],
          ['apache-integrations', 'apache-integrations'],
        ]),
      ],
      ['aspnetcore.memory_pool.owner', new Map<string, RawValue>([['(null)', undefined]])],
    ]);

    const getColor = getColorSeriesAccessorFn(
      DEFAULT_COLOR_MAPPING_CONFIG,
      invertedRawValueMap,
      palettes,
      false,
      {
        type: 'categories',
        categories: getColorCategories(rows, ['agent.name', 'aspnetcore.memory_pool.owner']),
      },
      ['agent.name', 'aspnetcore.memory_pool.owner']
    );

    const mysqlColor = getColor(createSeriesIdentifier('mysql-integrations', '(null)'));
    const apacheColor = getColor(createSeriesIdentifier('apache-integrations', '(null)'));

    expect(mysqlColor?.toLowerCase()).toBe(defaultPaletteColors[0]);
    expect(apacheColor?.toLowerCase()).toBe(defaultPaletteColors[1]);
    expect(mysqlColor?.toLowerCase()).not.toBe(neutralFallbackColor);
    expect(apacheColor?.toLowerCase()).not.toBe(neutralFallbackColor);
  });
});
