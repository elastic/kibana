/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subject, skip } from 'rxjs';
import type { ViewMode } from '@kbn/presentation-publishing';
import { initializeUnsavedChangesManager } from './unsaved_changes_manager';
import { initializeChangeSourceTracker } from './change_source_tracker';
import type { DashboardChangeSource } from '../../common/change_sources';
import { DEFAULT_DASHBOARD_STATE } from '../../common/default_dashboard_state';
import type { initializeLayoutManager } from './layout_manager';
import type { DashboardChildren } from './layout_manager/types';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { isDashboardSection } from '../../common';
import type { DashboardSettings } from './settings_manager';
import { initializeSettingsManager } from './settings_manager';
import type { initializeUnifiedSearchManager } from './unified_search_manager';
import type { initializeProjectRoutingManager } from './project_routing_manager';
import type { initializeApproximationManager } from './approximation_manager';
import type { DashboardPanel } from '@kbn/as-code-dashboard-schema';
import type { DashboardSaveEvent } from './types';
import { getSampleDashboardState } from '../mocks';

const setStateMock = () => new Promise<void>((resolve) => resolve());

const layoutUnsavedChanges$ = new BehaviorSubject<{ panels?: DashboardState['panels'] }>({});
const layoutManagerMock = {
  api: {
    children$: new BehaviorSubject<DashboardChildren>({}),
  },
  internalApi: {
    startComparing: () => layoutUnsavedChanges$,
    setLastSavedState: jest.fn(),
    serializeLayout: () => {
      const panels = layoutUnsavedChanges$.getValue()?.panels ?? [];
      return {
        panels,
        // create one reference per panel
        references: panels
          .filter((panel) => !isDashboardSection(panel))
          .map((panel, index) => ({
            name: 'savedObjectRef',
            type: (panel as DashboardPanel).type,
            id: `savedObject${index + 1}`,
          })),
      };
    },
  },
} as unknown as ReturnType<typeof initializeLayoutManager>;

const settingsManagerMock = {
  internalApi: {
    startComparing: () => new BehaviorSubject<Partial<DashboardSettings>>({}),
  },
} as unknown as ReturnType<typeof initializeSettingsManager>;
const unifiedSearchManagerMock = {
  internalApi: {
    startComparing: () =>
      new BehaviorSubject<
        Partial<Pick<DashboardState, 'filters' | 'query' | 'refresh_interval' | 'time_range'>>
      >({}),
  },
} as unknown as ReturnType<typeof initializeUnifiedSearchManager>;
const projectRoutingManagerMock = {
  internalApi: {
    startComparing: () => new BehaviorSubject<Partial<Pick<DashboardState, 'project_routing'>>>({}),
  },
} as unknown as ReturnType<typeof initializeProjectRoutingManager>;
const approximationManagerMock = {
  internalApi: {
    startComparing: () =>
      new BehaviorSubject<Partial<Pick<DashboardState, 'esql_approximation'>>>({}),
  },
} as unknown as ReturnType<typeof initializeApproximationManager>;
const savedObjectId$ = new BehaviorSubject<string | undefined>('dashboard1234');
const viewMode$ = new BehaviorSubject<ViewMode>('edit');
let onSave$: Subject<DashboardSaveEvent>;

const setBackupStateMock = jest.fn();

describe('unsavedChangesManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setBackupStateMock.mockReset();
    onSave$ = new Subject<DashboardSaveEvent>();

    layoutUnsavedChanges$.next({});

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../services/dashboard_api_services').getDashboardBackupService = () => ({
      setState: setBackupStateMock,
    });
  });

  describe('onUnsavedChanges', () => {
    describe('onSettingsChanges', () => {
      test('should have unsaved changes when tags change', (done) => {
        const settingsManager = initializeSettingsManager(getSampleDashboardState());
        const unsavedChangesManager = initializeUnsavedChangesManager({
          viewMode$,
          storeUnsavedChanges: false,
          lastSavedState: DEFAULT_DASHBOARD_STATE,
          layoutManager: layoutManagerMock,
          savedObjectId$,
          settingsManager,
          unifiedSearchManager: unifiedSearchManagerMock,
          projectRoutingManager: projectRoutingManagerMock,
          approximationManager: approximationManagerMock,
          setState: setStateMock,
          onSave$: onSave$.asObservable(),
          changeSourceTracker: initializeChangeSourceTracker(),
        });

        unsavedChangesManager.api.hasUnsavedChanges$
          .pipe(skip(1))
          .subscribe((hasUnsavedChanges) => {
            expect(hasUnsavedChanges).toBe(true);
            done();
          });

        settingsManager.api.setTags(['New tag']);
      });
    });

    describe('session state', () => {
      test('should backup unsaved panel changes and references when only layout changes', (done) => {
        initializeUnsavedChangesManager({
          viewMode$,
          storeUnsavedChanges: true,
          lastSavedState: DEFAULT_DASHBOARD_STATE,
          layoutManager: layoutManagerMock,
          savedObjectId$,
          settingsManager: settingsManagerMock,
          unifiedSearchManager: unifiedSearchManagerMock,
          projectRoutingManager: projectRoutingManagerMock,
          approximationManager: approximationManagerMock,
          setState: setStateMock,
          onSave$: onSave$.asObservable(),
          changeSourceTracker: initializeChangeSourceTracker(),
        });

        setBackupStateMock.mockImplementation((id, backupState) => {
          expect(id).toBe(savedObjectId$.value);
          expect(backupState).toMatchInlineSnapshot(`
            Object {
              "panels": Array [
                Object {
                  "config": Object {
                    "title": "New panel",
                  },
                  "type": "testType",
                },
              ],
              "viewMode": "edit",
            }
          `);
          done();
        });

        layoutUnsavedChanges$.next({
          panels: [
            {
              type: 'testType',
              config: {
                title: 'New panel',
              },
            } as unknown as DashboardPanel,
          ],
        });
      });
    });
  });

  describe('projectRouting changes', () => {
    it('should detect projectRouting changes as unsaved changes', (done) => {
      const projectRoutingChanges$ = new BehaviorSubject<
        Partial<Pick<DashboardState, 'project_routing'>>
      >({});
      const customProjectRoutingManagerMock = {
        internalApi: {
          startComparing: () => projectRoutingChanges$,
        },
      } as unknown as ReturnType<typeof initializeProjectRoutingManager>;

      const unsavedChangesManager = initializeUnsavedChangesManager({
        viewMode$,
        lastSavedState: getSampleDashboardState(),
        layoutManager: layoutManagerMock,
        savedObjectId$,
        settingsManager: settingsManagerMock,
        unifiedSearchManager: unifiedSearchManagerMock,
        projectRoutingManager: customProjectRoutingManagerMock,
        approximationManager: approximationManagerMock,
        setState: setStateMock,
        onSave$: onSave$.asObservable(),
        changeSourceTracker: initializeChangeSourceTracker(),
      });

      unsavedChangesManager.api.hasUnsavedChanges$.pipe(skip(1)).subscribe((hasChanges) => {
        expect(hasChanges).toBe(true);
        done();
      });

      // Simulate projectRouting change
      projectRoutingChanges$.next({ project_routing: '_alias:_origin' });
    });

    it('should have unsaved changes when projectRouting is different from saved value', (done) => {
      const lastSavedState = {
        ...getSampleDashboardState(),
        projectRouting: '_alias:_origin',
      };
      const projectRoutingChanges$ = new BehaviorSubject<
        Partial<Pick<DashboardState, 'project_routing'>>
      >({});
      const customProjectRoutingManagerMock = {
        internalApi: {
          startComparing: () => projectRoutingChanges$,
        },
      } as unknown as ReturnType<typeof initializeProjectRoutingManager>;

      const unsavedChangesManager = initializeUnsavedChangesManager({
        viewMode$,
        lastSavedState,
        layoutManager: layoutManagerMock,
        savedObjectId$,
        settingsManager: settingsManagerMock,
        unifiedSearchManager: unifiedSearchManagerMock,
        projectRoutingManager: customProjectRoutingManagerMock,
        approximationManager: approximationManagerMock,
        setState: setStateMock,
        onSave$: onSave$.asObservable(),
        changeSourceTracker: initializeChangeSourceTracker(),
      });

      unsavedChangesManager.api.hasUnsavedChanges$.pipe(skip(1)).subscribe((hasChanges) => {
        expect(hasChanges).toBe(true);
        done();
      });

      // Change to different value
      projectRoutingChanges$.next({ project_routing: 'ALL' });
    });
  });

  describe('approximation changes', () => {
    it('should detect esql_approximation changes as unsaved changes', (done) => {
      const approximationChanges$ = new BehaviorSubject<
        Partial<Pick<DashboardState, 'esql_approximation'>>
      >({});
      const customApproximationManagerMock = {
        internalApi: {
          startComparing: () => approximationChanges$,
        },
      } as unknown as ReturnType<typeof initializeApproximationManager>;

      const unsavedChangesManager = initializeUnsavedChangesManager({
        viewMode$,
        lastSavedState: getSampleDashboardState(),
        layoutManager: layoutManagerMock,
        savedObjectId$,
        settingsManager: settingsManagerMock,
        unifiedSearchManager: unifiedSearchManagerMock,
        projectRoutingManager: projectRoutingManagerMock,
        approximationManager: customApproximationManagerMock,
        setState: setStateMock,
        onSave$: onSave$.asObservable(),
        changeSourceTracker: initializeChangeSourceTracker(),
      });

      unsavedChangesManager.api.hasUnsavedChanges$.pipe(skip(1)).subscribe((hasChanges) => {
        expect(hasChanges).toBe(true);
        done();
      });

      approximationChanges$.next({ esql_approximation: true });
    });
  });

  describe('change sources', () => {
    const grid = { x: 0, y: 0, w: 12, h: 8 };
    const agentPanel: DashboardPanel = { type: 'testType', grid, config: { title: 'Agent panel' } };
    const userPanel: DashboardPanel = { type: 'testType', grid, config: { title: 'User panel' } };

    const createManager = ({
      storeUnsavedChanges = false,
      initialChangeSources,
      setState = setStateMock,
    }: {
      storeUnsavedChanges?: boolean;
      initialChangeSources?: DashboardChangeSource[];
      setState?: (state: DashboardState) => Promise<void>;
    } = {}) => {
      const changeSourceTracker = initializeChangeSourceTracker(initialChangeSources);
      const manager = initializeUnsavedChangesManager({
        viewMode$,
        storeUnsavedChanges,
        lastSavedState: DEFAULT_DASHBOARD_STATE,
        layoutManager: layoutManagerMock,
        savedObjectId$,
        settingsManager: settingsManagerMock,
        unifiedSearchManager: unifiedSearchManagerMock,
        projectRoutingManager: projectRoutingManagerMock,
        approximationManager: approximationManagerMock,
        setState,
        onSave$: onSave$.asObservable(),
        changeSourceTracker,
      });
      return { ...manager, changeSourceTracker };
    };

    const emitLayoutChanges = (changes: { panels?: DashboardState['panels'] }) => {
      layoutUnsavedChanges$.next(changes);
      jest.advanceTimersByTime(100);
    };

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('drops unsaved sources on reset to the last saved state', async () => {
      const { api, changeSourceTracker } = createManager({ initialChangeSources: ['agent'] });

      await api.asyncResetToLastSavedState();

      expect(changeSourceTracker.getUnsavedSources()).toEqual([]);
    });

    it('keeps sources added while a reset is being applied', async () => {
      let finishReset = () => {};
      const { api, changeSourceTracker } = createManager({
        setState: () => new Promise((resolve) => (finishReset = resolve)),
      });

      const reset = api.asyncResetToLastSavedState();
      changeSourceTracker.recordChange(['agent']);
      finishReset();
      await reset;

      expect(changeSourceTracker.getUnsavedSources()).toEqual(['agent']);
    });

    it('backs up the sources of unsaved changes', () => {
      const { changeSourceTracker } = createManager({ storeUnsavedChanges: true });

      changeSourceTracker.recordChange(['agent']);
      emitLayoutChanges({ panels: [agentPanel] });

      expect(setBackupStateMock).toHaveBeenLastCalledWith('dashboard1234', {
        viewMode: 'edit',
        panels: [agentPanel],
        changedBy: ['agent'],
      });
    });

    it('backs up only the sources of changes made since the last save', () => {
      const { changeSourceTracker } = createManager({
        storeUnsavedChanges: true,
        initialChangeSources: ['agent'],
      });
      changeSourceTracker.markSaved(changeSourceTracker.getLatestChanges());

      emitLayoutChanges({ panels: [agentPanel, userPanel] });
      expect(setBackupStateMock).toHaveBeenLastCalledWith('dashboard1234', {
        viewMode: 'edit',
        panels: [agentPanel, userPanel],
      });

      changeSourceTracker.recordChange(['agent']);
      emitLayoutChanges({ panels: [agentPanel] });
      expect(setBackupStateMock).toHaveBeenLastCalledWith('dashboard1234', {
        viewMode: 'edit',
        panels: [agentPanel],
        changedBy: ['agent'],
      });
    });

    it('backs up sources only alongside dashboard edits', () => {
      createManager({ storeUnsavedChanges: true, initialChangeSources: ['agent'] });

      emitLayoutChanges({});
      expect(setBackupStateMock).toHaveBeenLastCalledWith('dashboard1234', { viewMode: 'edit' });

      emitLayoutChanges({ panels: [agentPanel] });
      expect(setBackupStateMock).toHaveBeenLastCalledWith('dashboard1234', {
        viewMode: 'edit',
        panels: [agentPanel],
        changedBy: ['agent'],
      });
    });
  });

  describe('save events', () => {
    it('updates the last saved state when a save event is published', () => {
      const currentState = { ...getSampleDashboardState(), title: 'Updated title' };
      const unsavedChangesManager = initializeUnsavedChangesManager({
        viewMode$,
        lastSavedState: getSampleDashboardState(),
        layoutManager: layoutManagerMock,
        savedObjectId$,
        settingsManager: settingsManagerMock,
        unifiedSearchManager: unifiedSearchManagerMock,
        projectRoutingManager: projectRoutingManagerMock,
        approximationManager: approximationManagerMock,
        setState: setStateMock,
        onSave$: onSave$.asObservable(),
        changeSourceTracker: initializeChangeSourceTracker(),
      });
      const saveEvent = {
        previousDashboardId: 'dashboard-a',
        dashboardId: 'dashboard-b',
        dashboardState: currentState,
      };

      onSave$.next(saveEvent);

      expect(unsavedChangesManager.internalApi.getLastSavedState()).toEqual(currentState);
    });
  });
});
