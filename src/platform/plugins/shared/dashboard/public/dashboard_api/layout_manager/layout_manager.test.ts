/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';
import { BehaviorSubject } from 'rxjs';

import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type {
  HasLibraryTransforms,
  PhaseEvent,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import { initializeTitleManager } from '@kbn/presentation-publishing';

import type { DashboardState } from '../../../common';
import type { initializeTrackPanel } from '../track_panel';
import type { initializeViewModeManager } from '../view_mode_manager';
import { initializeLayoutManager } from './layout_manager';
import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '@kbn/controls-constants';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('54321'),
}));

const trackPanelMock = {
  setScrollToPanelId: jest.fn(),
  setHighlightPanelId: jest.fn(),
} as unknown as ReturnType<typeof initializeTrackPanel>;

const viewModeManagerMock = { api: { viewMode$: new BehaviorSubject('view') } } as ReturnType<
  typeof initializeViewModeManager
>;

describe('layout manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const PANEL_ONE_ID = 'panelOne';

  const panel1 = {
    grid: { w: 1, h: 1, x: 0, y: 0 },
    type: 'testPanelType',
    config: { title: 'Panel One' },
    uid: PANEL_ONE_ID,
  };

  const pinnedControls: DashboardState['pinned_panels'] = [
    {
      uid: 'control1',
      type: 'optionsListControl',
      config: {
        dataViewId: '',
        fieldName: '',
      },
    },
    {
      uid: 'control2',
      grow: true,
      width: 'small',
      type: 'optionsListControl',
      config: {
        dataViewId: '',
        fieldName: '',
      },
    },
  ];

  const titleManager = initializeTitleManager(panel1.config);
  const panel1Api: DefaultEmbeddableApi = {
    type: 'testPanelType',
    uuid: PANEL_ONE_ID,
    phase$: {} as unknown as PublishingSubject<PhaseEvent | undefined>,
    ...titleManager.api,
    serializeState: () => titleManager.getLatestState(),
  };

  const section1 = {
    title: 'Section one',
    collapsed: false,
    uid: 'section1',
    grid: {
      y: 1,
    },
    panels: [panel1],
  };

  test('can register child APIs', () => {
    const layoutManager = initializeLayoutManager(
      viewModeManagerMock,
      undefined,
      [panel1],
      [],
      trackPanelMock
    );
    layoutManager.api.registerChildApi(panel1Api);
    expect(layoutManager.api.children$.getValue()[PANEL_ONE_ID]).toBe(panel1Api);
  });

  test('should append incoming embeddables to existing panels', () => {
    const incomingEmbeddables = [
      {
        embeddableId: 'panelTwo',
        serializedState: {
          title: 'Panel Two',
        },
        size: {
          height: 1,
          width: 1,
        },
        type: 'testPanelType',
      },
      {
        embeddableId: 'panelThree',
        serializedState: {
          title: 'Panel Three',
        },
        size: {
          height: 1,
          width: 1,
        },
        type: 'anotherPanelType',
      },
    ];
    const layoutManager = initializeLayoutManager(
      viewModeManagerMock,
      incomingEmbeddables,
      [panel1],
      [],
      trackPanelMock
    );

    const layout = layoutManager.api.layout$.value;
    expect(Object.keys(layout.panels).length).toBe(3);
    expect(layout.panels.panelTwo).toEqual({
      grid: {
        h: 1,
        w: 1,
        x: 1,
        y: 0,
      },
      type: 'testPanelType',
    });
    expect(layout.panels.panelThree).toEqual({
      grid: {
        h: 1,
        w: 1,
        x: 2,
        y: 0,
      },
      type: 'anotherPanelType',
    });
    const incomingPanelStatePanelTwo =
      layoutManager.internalApi.getSerializedStateForPanel('panelTwo');
    const incomingPanelStatePanelThree =
      layoutManager.internalApi.getSerializedStateForPanel('panelThree');
    expect(incomingPanelStatePanelTwo).toEqual({
      title: 'Panel Two',
    });
    expect(incomingPanelStatePanelThree).toEqual({
      title: 'Panel Three',
    });
  });

  describe('duplicatePanel', () => {
    test('should add duplicated panel to layout', async () => {
      const layoutManager = initializeLayoutManager(
        viewModeManagerMock,
        undefined,
        [panel1],
        [],
        trackPanelMock
      );

      layoutManager.api.registerChildApi(panel1Api);

      await layoutManager.api.duplicatePanel('panelOne');

      const layout = layoutManager.api.layout$.value;
      expect(Object.keys(layout.panels).length).toBe(2);
      expect(layout.panels['54321']).toEqual({
        grid: {
          h: 1,
          w: 1,
          x: 1,
          y: 0,
        },
        type: 'testPanelType',
      });
      const duplicatedPanelState = layoutManager.internalApi.getSerializedStateForPanel('54321');
      expect(duplicatedPanelState).toEqual({
        title: 'Panel One (copy)',
      });
    });

    test('should clone by reference embeddable as by value', async () => {
      const layoutManager = initializeLayoutManager(
        viewModeManagerMock,
        undefined,
        [panel1],
        [],
        trackPanelMock
      );
      layoutManager.api.registerChildApi({
        ...panel1Api,
        checkForDuplicateTitle: jest.fn(),
        canLinkToLibrary: jest.fn(),
        canUnlinkFromLibrary: jest.fn(),
        saveToLibrary: jest.fn(),
        getSerializedStateByReference: jest.fn(),
        getSerializedStateByValue: () => ({
          isByValue: true,
        }),
      } as DefaultEmbeddableApi & HasLibraryTransforms);

      await layoutManager.api.duplicatePanel('panelOne');

      const duplicatedPanelState = layoutManager.internalApi.getSerializedStateForPanel('54321');
      expect(duplicatedPanelState).toEqual({
        isByValue: true,
        title: 'Panel One (copy)',
      });
    });

    test('should give a correct title to the clone of a clone', async () => {
      const layoutManager = initializeLayoutManager(
        viewModeManagerMock,
        undefined,
        [panel1],
        [],
        trackPanelMock
      );
      const titleManagerOfClone = initializeTitleManager({ title: 'Panel One (copy)' });
      layoutManager.api.registerChildApi({
        ...panel1Api,
        ...titleManagerOfClone.api,
        serializeState: () => titleManagerOfClone.getLatestState(),
      });

      await layoutManager.api.duplicatePanel('panelOne');

      const duplicatedPanelState = layoutManager.internalApi.getSerializedStateForPanel('54321');
      expect(duplicatedPanelState).toEqual({
        title: 'Panel One (copy 1)',
      });
    });
  });

  describe('canRemovePanels', () => {
    test('allows removing panels when there is no expanded panel', () => {
      const layoutManager = initializeLayoutManager(viewModeManagerMock, undefined, [panel1], [], {
        ...trackPanelMock,
        expandedPanelId$: new BehaviorSubject<string | undefined>(undefined),
      });
      expect(layoutManager.api.canRemovePanels()).toBe(true);
    });

    test('does not allow removing panels when there is an expanded panel', () => {
      const layoutManager = initializeLayoutManager(viewModeManagerMock, undefined, [panel1], [], {
        ...trackPanelMock,
        expandedPanelId$: new BehaviorSubject<string | undefined>('1'),
      });
      expect(layoutManager.api.canRemovePanels()).toBe(false);
    });
  });

  describe('getChildApi', () => {
    test('should return api when api is available', (done) => {
      const layoutManager = initializeLayoutManager(
        viewModeManagerMock,
        undefined,
        [panel1],
        [],
        trackPanelMock
      );

      layoutManager.api.getChildApi(PANEL_ONE_ID).then((api) => {
        expect(api).toBe(panel1Api);
        done();
      });

      layoutManager.api.registerChildApi(panel1Api);
    });

    test('should return api from panel in open section when api is available', (done) => {
      const layoutManager = initializeLayoutManager(
        viewModeManagerMock,
        undefined,
        [
          {
            ...section1,
            collapsed: false,
          },
        ],
        [],
        trackPanelMock
      );

      layoutManager.api.getChildApi(PANEL_ONE_ID).then((api) => {
        expect(api).toBe(panel1Api);
        done();
      });

      layoutManager.api.registerChildApi(panel1Api);
    });

    test('should return undefined from panel in closed section', (done) => {
      const layoutManager = initializeLayoutManager(
        viewModeManagerMock,
        undefined,
        [
          {
            ...section1,
            collapsed: true,
          },
        ],
        [],
        trackPanelMock
      );

      layoutManager.api.getChildApi(PANEL_ONE_ID).then((api) => {
        expect(api).toBeUndefined();
        done();
      });

      // do not call layoutManager.internalApi.registerChildApi
      // because api will never become available
    });
  });

  describe('pinned panels', () => {
    test('can pin panel', () => {
      const layoutManager = initializeLayoutManager(
        viewModeManagerMock,
        undefined,
        [
          panel1,
          {
            uid: 'control3',
            type: 'optionsListControl',
            config: {},
            grid: { x: 0, y: 2, h: 1, w: 1 },
          },
        ],
        pinnedControls,
        {
          ...trackPanelMock,
          expandedPanelId$: new BehaviorSubject<string | undefined>(undefined),
        }
      );

      layoutManager.api.pinPanel('control3');
      expect(layoutManager.api.layout$.getValue().pinnedPanels).toEqual({
        ['control1']: {
          ...pick(pinnedControls[0], ['grow', 'width', 'type']),
          order: 0,
        },
        ['control2']: {
          ...pick(pinnedControls[1], ['grow', 'width', 'type']),
          order: 1,
        },
        ['control3']: {
          type: 'optionsListControl',
          grow: DEFAULT_CONTROL_GROW,
          width: DEFAULT_CONTROL_WIDTH,
          order: 2,
        },
      });
      expect(layoutManager.api.layout$.getValue().panels).toEqual({
        [panel1.uid]: pick(panel1, ['grid', 'type']),
        // control3 gets removed as a panel
      });
    });

    test('can unpin panel', () => {
      const layoutManager = initializeLayoutManager(
        viewModeManagerMock,
        undefined,
        [panel1],
        pinnedControls,
        {
          ...trackPanelMock,
          expandedPanelId$: new BehaviorSubject<string | undefined>(undefined),
        }
      );
      expect(layoutManager.api.layout$.getValue().pinnedPanels).toEqual({
        ['control1']: {
          ...pick(pinnedControls[0], ['grow', 'width', 'type']),
          order: 0,
        },
        ['control2']: {
          ...pick(pinnedControls[1], ['grow', 'width', 'type']),
          order: 1,
        },
      });

      layoutManager.api.unpinPanel('control1');
      expect(layoutManager.api.layout$.getValue().pinnedPanels).toEqual({
        ['control2']: {
          ...pick(pinnedControls[1], ['grow', 'width', 'type']),
          order: 0, // adjusted order
        },
      });
      expect(layoutManager.api.layout$.getValue().panels).toEqual({
        [panel1.uid]: {
          type: 'testPanelType',
          grid: { ...panel1.grid, y: 2 }, // push panel 1 down,
        },
        ['control1']: {
          type: 'optionsListControl',
          grid: { x: 0, y: 0, w: 12, h: 2 },
        },
      });
    });

    test('determines when a panel is pinned', () => {
      const layoutManager = initializeLayoutManager(
        viewModeManagerMock,
        undefined,
        [
          panel1,
          {
            ...pinnedControls[1],
            uid: 'control2',
            grid: { x: 0, y: 0, w: 12, h: 12 },
            config: { title: 'Control' },
          },
        ],
        [pinnedControls[0]],
        {
          ...trackPanelMock,
          expandedPanelId$: new BehaviorSubject<string | undefined>(undefined),
        }
      );
      expect(layoutManager.api.panelIsPinned('control1')).toBe(true);
      expect(layoutManager.api.panelIsPinned('control2')).toBe(false);
    });
  });
});
