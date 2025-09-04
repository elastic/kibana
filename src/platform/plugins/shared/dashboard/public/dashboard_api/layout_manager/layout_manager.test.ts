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
  FetchSetting,
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

  const fetchSetting$ = new BehaviorSubject<FetchSetting>('always');

  const PANEL_ONE_ID = 'panelOne';

  const panel1 = {
    gridData: { w: 1, h: 1, x: 0, y: 0, i: PANEL_ONE_ID },
    type: 'testPanelType',
    panelConfig: { title: 'Panel One' },
    panelIndex: PANEL_ONE_ID,
  };

  const titleManager = initializeTitleManager(panel1.panelConfig);
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
    gridData: {
      y: 1,
      i: 'section1',
    },
    panels: [panel1],
  };

  test('can register child APIs', () => {
    const layoutManager = initializeLayoutManager(
      undefined,
      [panel1],
      trackPanelMock,
      () => [],
      fetchSetting$
    );
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
      () => [],
      fetchSetting$
    );

    const layout = layoutManager.internalApi.layout$.value;
    expect(Object.keys(layout.panels).length).toBe(2);
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
    test('should add duplicated panel to layout', async () => {
      const layoutManager = initializeLayoutManager(
        undefined,
        [panel1],
        trackPanelMock,
        () => [],
        fetchSetting$
      );
      layoutManager.internalApi.registerChildApi(panel1Api);

      await layoutManager.api.duplicatePanel('panelOne');

      const layout = layoutManager.internalApi.layout$.value;
      expect(Object.keys(layout.panels).length).toBe(2);
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
        [panel1],
        trackPanelMock,
        () => [],
        fetchSetting$
      );
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
      const layoutManager = initializeLayoutManager(
        undefined,
        [panel1],
        trackPanelMock,
        () => [],
        fetchSetting$
      );
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
        () => [],
        fetchSetting$
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
        () => [],
        fetchSetting$
      );
      expect(layoutManager.api.canRemovePanels()).toBe(false);
    });
  });

  describe('getChildApi', () => {
    test('should return api when api is available', (done) => {
      const layoutManager = initializeLayoutManager(
        undefined,
        [panel1],
        trackPanelMock,
        () => [],
        fetchSetting$
      );

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
        () => [],
        fetchSetting$
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
        () => [],
        fetchSetting$
      );

      layoutManager.api.getChildApi(PANEL_ONE_ID).then((api) => {
        expect(api).toBeUndefined();
        done();
      });

      // do not call layoutManager.internalApi.registerChildApi
      // because api will never become available
    });
  });

  describe('panelCounts', () => {
    const PANEL_TWO_ID = 'panelTwo';
    const panel2 = {
      gridData: { w: 1, h: 1, x: 1, y: 0, i: PANEL_TWO_ID },
      type: 'testPanelType',
      panelConfig: { title: 'Panel Two' },
      panelIndex: PANEL_TWO_ID,
    };

    const PANEL_THREE_ID = 'panelThree';
    const panel3 = {
      gridData: { w: 1, h: 1, x: 0, y: 0, i: PANEL_THREE_ID },
      type: 'testPanelType',
      panelConfig: { title: 'Panel Three' },
      panelIndex: PANEL_THREE_ID,
    };

    const section2 = {
      title: 'Section two',
      collapsed: true,
      gridData: {
        y: 2,
        i: 'section2',
      },
      panels: [panel3],
    };

    test('should return the correct number of visible panels when fetchSetting is always', async () => {
      const localFetchSetting$ = new BehaviorSubject<FetchSetting>('always');

      const layoutManager = initializeLayoutManager(
        undefined,
        [section1, panel2, section2],
        trackPanelMock,
        () => [],
        localFetchSetting$
      );

      const panelCounts = layoutManager.internalApi.panelCounters$.getValue();
      expect(panelCounts.panelCount).toBe(3);
      expect(panelCounts.visiblePanelsCount).toBe(2); // panel3 is in a collapsed section
      expect(panelCounts.sectionCount).toBe(2);
    });

    test('should return the correct number of visible panels when fetchSetting is onlyVisible', async () => {
      const localFetchSetting$ = new BehaviorSubject<FetchSetting>('onlyVisible');

      const layoutManager = initializeLayoutManager(
        undefined,
        [section1, panel2, section2],
        trackPanelMock,
        () => [],
        localFetchSetting$
      );

      const panel1ApiWithVisibility = {
        ...panel1Api,
        isVisible$: new BehaviorSubject(true),
        getIsVisible$: () => new BehaviorSubject(true),
      };
      const panel2ApiWithVisibility = {
        ...panel1Api,
        uuid: PANEL_TWO_ID,
        isVisible$: new BehaviorSubject(true),
        getIsVisible$: () => new BehaviorSubject(true),
      };
      const panel3ApiWithVisibility = {
        ...panel1Api,
        uuid: PANEL_THREE_ID,
        isVisible$: new BehaviorSubject(false),
        getIsVisible$: () => new BehaviorSubject(false),
      };

      layoutManager.internalApi.registerChildApi(panel1ApiWithVisibility);
      layoutManager.internalApi.registerChildApi(panel2ApiWithVisibility);
      layoutManager.internalApi.registerChildApi(panel3ApiWithVisibility);

      const panelCounts = layoutManager.internalApi.panelCounters$.getValue();
      expect(panelCounts.panelCount).toBe(3);
      expect(panelCounts.visiblePanelsCount).toBe(2); // panel1 and panel2 are visible
      expect(panelCounts.sectionCount).toBe(2);
    });
  });
});
