/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedDashboardPanel730ToLatest } from '../../common';
import { findByValueEmbeddables } from './find_by_value_embeddables';

const visualizationByValue = {
  embeddableConfig: {
    value: 'visualization-by-value',
  },
  type: 'visualization',
} as unknown as SavedDashboardPanel730ToLatest;

const mapByValue = {
  embeddableConfig: {
    value: 'map-by-value',
  },
  type: 'map',
} as unknown as SavedDashboardPanel730ToLatest;

const embeddableByRef = {
  panelRefName: 'panel_ref_1',
} as unknown as SavedDashboardPanel730ToLatest;

describe('findByValueEmbeddables', () => {
  it('finds the by value embeddables for the given type', async () => {
    const savedObjectsResult = {
      saved_objects: [
        {
          attributes: {
            panelsJSON: JSON.stringify([visualizationByValue, mapByValue, embeddableByRef]),
          },
        },
        {
          attributes: {
            panelsJSON: JSON.stringify([embeddableByRef, mapByValue, visualizationByValue]),
          },
        },
      ],
    };
    const savedObjectClient = { find: jest.fn().mockResolvedValue(savedObjectsResult) };

    const maps = await findByValueEmbeddables(savedObjectClient, 'map');

    expect(maps.length).toBe(2);
    expect(maps[0]).toEqual(mapByValue.embeddableConfig);
    expect(maps[1]).toEqual(mapByValue.embeddableConfig);

    const visualizations = await findByValueEmbeddables(savedObjectClient, 'visualization');

    expect(visualizations.length).toBe(2);
    expect(visualizations[0]).toEqual(visualizationByValue.embeddableConfig);
    expect(visualizations[1]).toEqual(visualizationByValue.embeddableConfig);
  });
});
