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
import type { DashboardPanel, DashboardState } from '@kbn/as-code-dashboard-schema';
import { initializeUnsavedChangesManager } from './unsaved_changes_manager';
import { initializeChangeSourceTracker } from './change_source_tracker';
import type { DashboardChangeSource } from '../../common/change_sources';
import { DEFAULT_DASHBOARD_STATE } from '../../common/default_dashboard_state';
import type { initializeLayoutManager } from './layout_manager';
import type { DashboardChildren } from './layout_manager/types';
import type { DashboardSaveEvent } from './types';
import { getSampleDashboardState } from '../mocks';

const setStateMock = () => new Promise<void>((resolve) => resolve());

const layoutManagerMock = {
  api: {
    children$: new BehaviorSubject<DashboardChildren>({}),
  },
  internalApi: {
    panelTypeComparers$: new BehaviorSubject({
      testType: (a?: { a?: number }, b?: { a?: number }) => a?.a === b?.a,
    }),
    setLastSavedState: jest.fn(),
  },
} as unknown as ReturnType<typeof initializeLayoutManager>;

const grid = { x: 0, y: 0, w: 12, h: 8 };
const savedObjectId$ = new BehaviorSubject<string | undefined>('dashboard1234');
const viewMode$ = new BehaviorSubject<ViewMode>('edit');
let onSave$: Subject<DashboardSaveEvent>;
let currentState$: BehaviorSubject<DashboardState>;

const setBackupStateMock = jest.fn();

const createManager = ({
  lastSavedState = DEFAULT_DASHBOARD_STATE,
  storeUnsavedChanges = false,
  hasProjectRouting = true,
  initialChangeSources,
  setState = setStateMock,
}: {
  lastSavedState?: DashboardState;
  storeUnsavedChanges?: boolean;
  hasProjectRouting?: boolean;
  initialChangeSources?: DashboardChangeSource[];
  setState?: (state: DashboardState) => Promise<void>;
} = {}) => {
  currentState$ = new BehaviorSubject<DashboardState>(lastSavedState);
  const changeSourceTracker = initializeChangeSourceTracker(initialChangeSources);
  const manager = initializeUnsavedChangesManager({
    viewMode$,
    storeUnsavedChanges,
    lastSavedState,
    layoutManager: layoutManagerMock,
    savedObjectId$,
    getState: () => currentState$.getValue(),
    anyStateChange$: currentState$.pipe(skip(1)),
    hasProjectRouting,
    setState,
    onSave$: onSave$.asObservable(),
    changeSourceTracker,
  });
  return { ...manager, changeSourceTracker };
};

const expectUnsavedChanges = (
  manager: ReturnType<typeof createManager>,
  expected: boolean,
  done: jest.DoneCallback
) => {
  manager.api.hasUnsavedChanges$.pipe(skip(1)).subscribe((hasUnsavedChanges) => {
    expect(hasUnsavedChanges).toBe(expected);
    done();
  });
};

describe('unsavedChangesManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setBackupStateMock.mockReset();
    onSave$ = new Subject<DashboardSaveEvent>();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../services/dashboard_api_services').getDashboardBackupService = () => ({
      setState: setBackupStateMock,
    });
  });

  it('passes the last saved state to the layout before comparing', () => {
    const lastSavedState = getSampleDashboardState();
    createManager({ lastSavedState });
    expect(layoutManagerMock.internalApi.setLastSavedState).toHaveBeenCalledWith(lastSavedState);
  });

  describe('onUnsavedChanges', () => {
    describe('onSettingsChanges', () => {
      test('should have unsaved changes when tags change', (done) => {
        const manager = createManager({ lastSavedState: getSampleDashboardState() });
        expectUnsavedChanges(manager, true, done);

        currentState$.next({ ...currentState$.getValue(), tags: ['New tag'] });
      });
    });

    test('should have unsaved changes when a panel that has not loaded changes', (done) => {
      const panel: DashboardPanel = { id: 'panel1', type: 'testType', grid, config: { a: 1 } };
      const manager = createManager({
        lastSavedState: { ...DEFAULT_DASHBOARD_STATE, panels: [panel] },
      });
      expectUnsavedChanges(manager, true, done);

      currentState$.next({
        ...currentState$.getValue(),
        panels: [{ ...panel, config: { a: 2 } }],
      });
    });

    describe('session state', () => {
      test('should backup unsaved panel changes when only layout changes', (done) => {
        createManager({ storeUnsavedChanges: true });

        setBackupStateMock.mockImplementation((id, backupState) => {
          expect(id).toBe(savedObjectId$.value);
          expect(backupState).toMatchInlineSnapshot(`
            Object {
              "panels": Array [
                Object {
                  "config": Object {
                    "title": "New panel",
                  },
                  "grid": Object {
                    "h": 8,
                    "w": 12,
                    "x": 0,
                    "y": 0,
                  },
                  "type": "testType",
                },
              ],
              "viewMode": "edit",
            }
          `);
          done();
        });

        currentState$.next({
          ...currentState$.getValue(),
          panels: [{ type: 'testType', grid, config: { title: 'New panel' } }],
        });
      });
    });
  });

  describe('projectRouting changes', () => {
    it('should detect projectRouting changes as unsaved changes', (done) => {
      const manager = createManager({ lastSavedState: getSampleDashboardState() });
      expectUnsavedChanges(manager, true, done);

      currentState$.next({ ...currentState$.getValue(), project_routing: '_alias:_origin' });
    });

    it('should have unsaved changes when projectRouting is different from saved value', (done) => {
      const manager = createManager({
        lastSavedState: getSampleDashboardState({ project_routing: '_alias:_origin' }),
      });
      expectUnsavedChanges(manager, true, done);

      currentState$.next({ ...currentState$.getValue(), project_routing: 'ALL' });
    });

    it('keeps the saved projectRouting without cross-project search', () => {
      jest.useFakeTimers();
      createManager({
        lastSavedState: getSampleDashboardState({ project_routing: '_alias:_origin' }),
        hasProjectRouting: false,
        storeUnsavedChanges: true,
      });

      const { project_routing: _, ...stateWithoutProjectRouting } = currentState$.getValue();
      currentState$.next(stateWithoutProjectRouting);
      jest.advanceTimersByTime(200);

      expect(setBackupStateMock).toHaveBeenLastCalledWith('dashboard1234', { viewMode: 'edit' });
      jest.useRealTimers();
    });
  });

  describe('approximation changes', () => {
    it('should detect esql_approximation changes as unsaved changes', (done) => {
      const manager = createManager({ lastSavedState: getSampleDashboardState() });
      expectUnsavedChanges(manager, true, done);

      currentState$.next({ ...currentState$.getValue(), esql_approximation: true });
    });
  });

  describe('change sources', () => {
    const agentPanel: DashboardPanel = { type: 'testType', grid, config: { title: 'Agent panel' } };
    const userPanel: DashboardPanel = { type: 'testType', grid, config: { title: 'User panel' } };

    const emitLayoutChanges = (panels: DashboardState['panels']) => {
      currentState$.next({ ...currentState$.getValue(), panels });
      // the state diff and the backup are each debounced
      jest.advanceTimersByTime(200);
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
      emitLayoutChanges([agentPanel]);

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

      emitLayoutChanges([agentPanel, userPanel]);
      expect(setBackupStateMock).toHaveBeenLastCalledWith('dashboard1234', {
        viewMode: 'edit',
        panels: [agentPanel, userPanel],
      });

      changeSourceTracker.recordChange(['agent']);
      emitLayoutChanges([agentPanel]);
      expect(setBackupStateMock).toHaveBeenLastCalledWith('dashboard1234', {
        viewMode: 'edit',
        panels: [agentPanel],
        changedBy: ['agent'],
      });
    });

    it('backs up sources only alongside dashboard edits', () => {
      createManager({ storeUnsavedChanges: true, initialChangeSources: ['agent'] });

      emitLayoutChanges(DEFAULT_DASHBOARD_STATE.panels);
      expect(setBackupStateMock).toHaveBeenLastCalledWith('dashboard1234', { viewMode: 'edit' });

      emitLayoutChanges([agentPanel]);
      expect(setBackupStateMock).toHaveBeenLastCalledWith('dashboard1234', {
        viewMode: 'edit',
        panels: [agentPanel],
        changedBy: ['agent'],
      });
    });
  });
});
