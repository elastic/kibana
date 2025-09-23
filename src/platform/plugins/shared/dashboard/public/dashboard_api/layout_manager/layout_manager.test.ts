/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { initializeLayoutManager } from './layout_manager';
import type { initializeTrackPanel } from '../track_panel';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type {
  HasLibraryTransforms,
  PhaseEvent,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import { initializeTitleManager } from '@kbn/presentation-publishing';
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

  const panel1 = {
    grid: { w: 1, h: 1, x: 0, y: 0, i: PANEL_ONE_ID },
    type: 'testPanelType',
    config: { title: 'Panel One' },
    uid: PANEL_ONE_ID,
  };

  const titleManager = initializeTitleManager(panel1.config);
  const panel1Api: DefaultEmbeddableApi = {
    type: 'testPanelType',
    uuid: PANEL_ONE_ID,
    phase$: {} as unknown as PublishingSubject<PhaseEvent | undefined>,
    ...titleManager.api,
    serializeState: () => ({
      rawState: titleManager.getLatestState(),
    }),
  };

  const section1 = {
    title: 'Section one',
    collapsed: false,
    grid: {
      y: 1,
      i: 'section1',
    },
    panels: [panel1],
  };

  test('can register child APIs', () => {
    const layoutManager = initializeLayoutManager(undefined, [panel1], trackPanelMock, () => []);
    layoutManager.internalApi.registerChildApi(panel1Api);
    expect(layoutManager.api.children$.getValue()[PANEL_ONE_ID]).toBe(panel1Api);
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
      [panel1],
      trackPanelMock,
      () => []
    );

    const layout = layoutManager.internalApi.layout$.value;
    expect(Object.keys(layout.panels).length).toBe(2);
    expect(layout.panels.panelTwo).toEqual({
      grid: {
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
    test('should add duplicated panel to layout', async () => {
      const layoutManager = initializeLayoutManager(undefined, [panel1], trackPanelMock, () => []);
      layoutManager.internalApi.registerChildApi(panel1Api);

      await layoutManager.api.duplicatePanel('panelOne');

      const layout = layoutManager.internalApi.layout$.value;
      expect(Object.keys(layout.panels).length).toBe(2);
      expect(layout.panels['54321']).toEqual({
        grid: {
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
      const layoutManager = initializeLayoutManager(undefined, [panel1], trackPanelMock, () => []);
      layoutManager.internalApi.registerChildApi({
        ...panel1Api,
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
      const layoutManager = initializeLayoutManager(undefined, [panel1], trackPanelMock, () => []);
      const titleManagerOfClone = initializeTitleManager({ title: 'Panel One (copy)' });
      layoutManager.internalApi.registerChildApi({
        ...panel1Api,
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
        [panel1],
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
        [panel1],
        {
          ...trackPanelMock,
          expandedPanelId$: new BehaviorSubject<string | undefined>('1'),
        },
        () => []
      );
      expect(layoutManager.api.canRemovePanels()).toBe(false);
    });
  });

  describe('getChildApi', () => {
    test('should return api when api is available', (done) => {
      const layoutManager = initializeLayoutManager(undefined, [panel1], trackPanelMock, () => []);

      layoutManager.api.getChildApi(PANEL_ONE_ID).then((api) => {
        expect(api).toBe(panel1Api);
        done();
      });

      layoutManager.internalApi.registerChildApi(panel1Api);
    });

    test('should return api from panel in open section when api is available', (done) => {
      const layoutManager = initializeLayoutManager(
        undefined,
        [
          {
            ...section1,
            collapsed: false,
          },
        ],
        trackPanelMock,
        () => []
      );

      layoutManager.api.getChildApi(PANEL_ONE_ID).then((api) => {
        expect(api).toBe(panel1Api);
        done();
      });

      layoutManager.internalApi.registerChildApi(panel1Api);
    });

    test('should return undefined from panel in closed section', (done) => {
      const layoutManager = initializeLayoutManager(
        undefined,
        [
          {
            ...section1,
            collapsed: true,
          },
        ],
        trackPanelMock,
        () => []
      );

      layoutManager.api.getChildApi(PANEL_ONE_ID).then((api) => {
        expect(api).toBeUndefined();
        done();
      });

      // do not call layoutManager.internalApi.registerChildApi
      // because api will never become available
    });
  });
});
