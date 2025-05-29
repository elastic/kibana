/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardPanelMap } from '../../common';
import { initializePanelsManager } from './panels_manager';
import { initializeTrackPanel } from './track_panel';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { PhaseEvent, PublishingSubject } from '@kbn/presentation-publishing';

const trackPanelMock = {
  setScrollToPanelId: jest.fn(),
  setHighlightPanelId: jest.fn(),
} as unknown as ReturnType<typeof initializeTrackPanel>;

describe('panels manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const panels: DashboardPanelMap = {
    panelOne: {
      gridData: { w: 1, h: 1, x: 0, y: 0, i: 'panelOne' },
      type: 'testPanelType',
      explicitInput: { title: 'Panel One' },
    },
  };

  const childApi: DefaultEmbeddableApi = {
    type: panels.panelOne.type,
    uuid: panels.panelOne.gridData.i,
    phase$: {} as unknown as PublishingSubject<PhaseEvent | undefined>,
    serializeState: jest.fn(),
  };

  it('can register child APIs', () => {
    const panelsManager = initializePanelsManager(undefined, panels, trackPanelMock, () => []);
    panelsManager.internalApi.registerChildApi(childApi);
    expect(panelsManager.api.children$.getValue()[panels.panelOne.gridData.i]).toBe(childApi);
  });

  it('serializes the latest state of all panels', () => {
    const panelsManager = initializePanelsManager(undefined, panels, trackPanelMock, () => []);

    panelsManager.internalApi.registerChildApi(childApi);
    panelsManager.internalApi.setChildState(panels.panelOne.gridData.i, {
      rawState: { title: 'Updated Panel One' },
    });
    const serializedPanels = panelsManager.internalApi.serializePanels();
    expect(serializedPanels).toEqual({
      panels: {
        panelOne: {
          gridData: { w: 1, h: 1, x: 0, y: 0, i: 'panelOne' },
          type: 'testPanelType',
          explicitInput: { title: 'Updated Panel One' },
        },
      },
      references: [],
    });
  });

  it('serializes the latest state of all panels when an unrecoverable error has occurred on a child API', () => {
    const panelsManager = initializePanelsManager(undefined, panels, trackPanelMock, () => []);

    // if an unrecoverable error occurred, the child API should not be registered
    expect(panelsManager.api.children$.getValue()[panels.panelOne.gridData.i]).toBe(undefined);

    // serializing should still work, returning the last known state of the panel
    const serializedPanels = panelsManager.internalApi.serializePanels();
    expect(serializedPanels).toEqual({
      panels: {
        panelOne: {
          gridData: { w: 1, h: 1, x: 0, y: 0, i: 'panelOne' },
          type: 'testPanelType',
          explicitInput: { title: 'Panel One' },
        },
      },
      references: [],
    });
  });
});
