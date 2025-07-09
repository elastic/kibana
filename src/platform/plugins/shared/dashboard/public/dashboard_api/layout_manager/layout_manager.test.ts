/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { initializeLayoutManager } from './layout_manager';
import { initializeTrackPanel } from '../track_panel';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import {
  HasLibraryTransforms,
  PhaseEvent,
  PublishingSubject,
  initializeTitleManager,
} from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';

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

  const PANEL_ONE_ID = 'panelOne';

  const panels = [
    {
      gridData: { w: 1, h: 1, x: 0, y: 0, i: PANEL_ONE_ID },
      type: 'testPanelType',
      panelConfig: { title: 'Panel One' },
      panelIndex: PANEL_ONE_ID,
    },
  ];

  const childApi: DefaultEmbeddableApi = {
    type: 'testPanelType',
    uuid: PANEL_ONE_ID,
    phase$: {} as unknown as PublishingSubject<PhaseEvent | undefined>,
    serializeState: jest.fn(),
  };

  test('can register child APIs', () => {
    const layoutManager = initializeLayoutManager(undefined, panels, trackPanelMock, () => []);
    layoutManager.internalApi.registerChildApi(childApi);
    expect(layoutManager.api.children$.getValue()[PANEL_ONE_ID]).toBe(childApi);
  });

  test('should append incoming embeddable to existing panels', () => {
    const incomingEmbeddable = {
      embeddableId: 'panelTwo',
      serializedState: {
        rawState: {
          title: 'Panel Two',
        },
      },
      size: {
        height: 1,
        width: 1,
      },
      type: 'testPanelType',
    };
    const layoutManager = initializeLayoutManager(
      incomingEmbeddable,
      panels,
      trackPanelMock,
      () => []
    );

    const layout = layoutManager.internalApi.layout$.value;
    expect(Object.keys(layout.panels).length).toBe(Object.keys(panels).length + 1);
    expect(layout.panels.panelTwo).toEqual({
      gridData: {
        h: 1,
        i: 'panelTwo',
        sectionId: undefined,
        w: 1,
        x: 1,
        y: 0,
      },
      type: 'testPanelType',
    });
    const incomingPanelState = layoutManager.internalApi.getSerializedStateForPanel('panelTwo');
    expect(incomingPanelState.rawState).toEqual({
      title: 'Panel Two',
    });
  });

  describe('duplicatePanel', () => {
    const titleManager = initializeTitleManager(panels[0].panelConfig);
    const childApiToDuplicate = {
      ...childApi,
      ...titleManager.api,
      serializeState: () => ({
        rawState: titleManager.getLatestState(),
      }),
    };

    test('should add duplicated panel to layout', async () => {
      const layoutManager = initializeLayoutManager(undefined, panels, trackPanelMock, () => []);
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
      const layoutManager = initializeLayoutManager(undefined, panels, trackPanelMock, () => []);
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
      const layoutManager = initializeLayoutManager(undefined, panels, trackPanelMock, () => []);
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

  describe('canRemovePanels', () => {
    test('allows removing panels when there is no expanded panel', () => {
      const layoutManager = initializeLayoutManager(
        undefined,
        panels,
        {
          ...trackPanelMock,
          expandedPanelId$: new BehaviorSubject<string | undefined>(undefined),
        },
        () => []
      );
      expect(layoutManager.api.canRemovePanels()).toBe(true);
    });

    test('does not allow removing panels when there is an expanded panel', () => {
      const layoutManager = initializeLayoutManager(
        undefined,
        panels,
        {
          ...trackPanelMock,
          expandedPanelId$: new BehaviorSubject<string | undefined>('1'),
        },
        () => []
      );
      expect(layoutManager.api.canRemovePanels()).toBe(false);
    });
  });
});
