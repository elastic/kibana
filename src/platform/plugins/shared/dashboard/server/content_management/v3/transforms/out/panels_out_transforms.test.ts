/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import { createEmbeddableStartMock } from '@kbn/embeddable-plugin/server/mocks';
import { transformPanelsOut } from './panels_out_transforms';

const embeddableStartMock = createEmbeddableStartMock();

describe('transformPanelsOut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should transform panels JSON and inject saved object id for by-ref panels', async () => {
    const panelsJSON = JSON.stringify([
      {
        gridData: { x: 0, y: 0, w: 12, h: 12, i: '1' },
        id: '1',
        embeddableConfig: { foo: 'bar' },
        panelIndex: '1',
        panelRefName: 'panel_1',
        title: 'Panel 1',
        type: 'foo',
        version: '1.0.0',
      },
    ]);

    const references: SavedObjectReference[] = [{ name: '1:panel_1', type: 'foo', id: '123' }];

    const result = await transformPanelsOut({
      panelsJSON,
      embeddable: embeddableStartMock,
      references,
    });

    expect(result).toEqual([
      {
        gridData: { x: 0, y: 0, w: 12, h: 12, i: '1' },
        id: '1',
        panelConfig: { foo: 'bar', savedObjectId: '123' },
        panelIndex: '1',
        title: 'Panel 1',
        type: 'foo',
        version: '1.0.0',
      },
    ]);
  });

  it('should throw an error if a reference is missing', async () => {
    const panelsJSON = JSON.stringify([
      {
        gridData: { x: 0, y: 0, w: 12, h: 12, i: '1' },
        id: '1',
        embeddableConfig: { foo: 'bar' },
        panelIndex: '1',
        panelRefName: 'panel_1',
        title: 'Panel 1',
        type: 'foo',
        version: '1.0.0',
      },
    ]);

    const references: SavedObjectReference[] = [];

    await expect(
      async () =>
        await transformPanelsOut({ panelsJSON, embeddable: embeddableStartMock, references })
    ).rejects.toThrow('Could not find reference "panel_1"');
  });
});
