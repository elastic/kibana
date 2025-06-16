/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardPanelMap } from '../../common';
import { initializeLayoutManager } from './layout_manager';
import { initializeTrackPanel } from './track_panel';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import {
  HasLibraryTransforms,
  PhaseEvent,
  PublishingSubject,
  initializeTitleManager,
} from '@kbn/presentation-publishing';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('54321'),
}));

const trackPanelMock = {
  setScrollToPanelId: jest.fn(),
  setHighlightPanelId: jest.fn(),
} as unknown as ReturnType<typeof initializeTrackPanel>;

describe('layout manager', () => {
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

  test('can register child APIs', () => {
    const layoutManager = initializeLayoutManager(undefined, panels, {}, trackPanelMock, () => []);
    layoutManager.internalApi.registerChildApi(childApi);
    expect(layoutManager.api.children$.getValue()[panels.panelOne.gridData.i]).toBe(childApi);
  });

  describe('serializeLayout', () => {
    test('should serialize the latest state of all panels', () => {
      const layoutManager = initializeLayoutManager(
        undefined,
        panels,
        {},
        trackPanelMock,
        () => []
      );

      layoutManager.internalApi.registerChildApi(childApi);
      layoutManager.internalApi.setChildState(panels.panelOne.gridData.i, {
        rawState: { title: 'Updated Panel One' },
      });
      const serializedLayout = layoutManager.internalApi.serializeLayout();
      expect(serializedLayout.panels).toEqual({
        panelOne: {
          gridData: { w: 1, h: 1, x: 0, y: 0, i: 'panelOne' },
          type: 'testPanelType',
          explicitInput: { title: 'Updated Panel One' },
        },
      });
    });

    test('should serialize the latest state of all panels when a child API is unavailable', () => {
      const layoutManager = initializeLayoutManager(
        undefined,
        panels,
        {},
        trackPanelMock,
        () => []
      );
      expect(layoutManager.api.children$.getValue()[panels.panelOne.gridData.i]).toBe(undefined);

      // serializing should still work without an API present, returning the last known state of the panel
      const serializedLayout = layoutManager.internalApi.serializeLayout();
      expect(serializedLayout.panels).toEqual({
        panelOne: {
          gridData: { w: 1, h: 1, x: 0, y: 0, i: 'panelOne' },
          type: 'testPanelType',
          explicitInput: { title: 'Panel One' },
        },
      });
    });
  });

  describe('duplicatePanel', () => {
    const titleManager = initializeTitleManager(panels.panelOne.explicitInput);
    const childApiToDuplicate = {
      ...childApi,
      ...titleManager.api,
      serializeState: () => ({
        rawState: titleManager.getLatestState(),
      }),
    };

    test('should add duplicated panel to layout', async () => {
      const layoutManager = initializeLayoutManager(
        undefined,
        panels,
        {},
        trackPanelMock,
        () => []
      );
      layoutManager.internalApi.registerChildApi(childApiToDuplicate);

      await layoutManager.api.duplicatePanel('panelOne');

      const layout = layoutManager.internalApi.layout$.value;
      expect(Object.keys(layout.panels).length).toBe(Object.keys(panels).length + 1);
      expect(layout.panels['54321']).toEqual({
        gridData: {
          h: 1,
          i: '54321',
          sectionId: undefined,
          w: 1,
          x: 1,
          y: 0,
        },
        type: 'testPanelType',
      });
      const duplicatedPanelState = layoutManager.internalApi.getSerializedStateForPanel('54321');
      expect(duplicatedPanelState.rawState).toEqual({
        title: 'Panel One (copy)',
      });
    });

    test('should clone by reference embeddable as by value', async () => {
      const layoutManager = initializeLayoutManager(
        undefined,
        panels,
        {},
        trackPanelMock,
        () => []
      );
      layoutManager.internalApi.registerChildApi({
        ...childApiToDuplicate,
        checkForDuplicateTitle: jest.fn(),
        canLinkToLibrary: jest.fn(),
        canUnlinkFromLibrary: jest.fn(),
        saveToLibrary: jest.fn(),
        getSerializedStateByReference: jest.fn(),
        getSerializedStateByValue: () => ({
          rawState: {
            isByValue: true,
          },
        }),
      } as DefaultEmbeddableApi & HasLibraryTransforms);

      await layoutManager.api.duplicatePanel('panelOne');

      const duplicatedPanelState = layoutManager.internalApi.getSerializedStateForPanel('54321');
      expect(duplicatedPanelState.rawState).toEqual({
        isByValue: true,
        title: 'Panel One (copy)',
      });
    });

    test('should give a correct title to the clone of a clone', async () => {
      const layoutManager = initializeLayoutManager(
        undefined,
        panels,
        {},
        trackPanelMock,
        () => []
      );
      const titleManagerOfClone = initializeTitleManager({ title: 'Panel One (copy)' });
      layoutManager.internalApi.registerChildApi({
        ...childApiToDuplicate,
        ...titleManagerOfClone.api,
        serializeState: () => ({
          rawState: titleManagerOfClone.getLatestState(),
        }),
      });

      await layoutManager.api.duplicatePanel('panelOne');

      const duplicatedPanelState = layoutManager.internalApi.getSerializedStateForPanel('54321');
      expect(duplicatedPanelState.rawState).toEqual({
        title: 'Panel One (copy 1)',
      });
    });
  });
});
