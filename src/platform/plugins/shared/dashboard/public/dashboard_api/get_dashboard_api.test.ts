/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_DASHBOARD_STATE } from '../../common/default_dashboard_state';
import { coreServices } from '../services/kibana_services';
import { getDashboardApi } from './get_dashboard_api';
import { openSaveModal } from './save_modal/open_save_modal';
import { saveDashboard } from './save_modal/save_dashboard';

jest.mock('./save_modal/save_dashboard', () => ({
  saveDashboard: jest.fn(),
}));

jest.mock('./save_modal/open_save_modal', () => ({
  openSaveModal: jest.fn(),
}));

const getDashboardSavedEvents = () =>
  jest
    .mocked(coreServices.analytics.reportEvent)
    .mock.calls.filter(([eventType]) => eventType === 'dashboard_saved');

describe('initializeSettingsManager', () => {
  describe('anyStateChange$', () => {
    test('should not emit on subscribe and emit when any state changes', (done) => {
      const { api } = getDashboardApi({
        incomingEmbeddables: [],
        initialState: DEFAULT_DASHBOARD_STATE,
      });
      api.anyStateChange$.subscribe(() => {
        try {
          const { title } = api.getSettings();
          expect(title).toBe('Updated title');
        } catch (error) {
          // title assertion fails when
          // anyStateChange$ emits on subscribe
          done(error);
          return;
        }
        done();
      });
      api.setSettings({
        ...api.getSettings(),
        title: 'Updated title',
      });
    });
  });
});

describe('dashboard_saved telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('reports each successful quick save once, with sources changed since the last save', async () => {
    jest
      .mocked(saveDashboard)
      .mockResolvedValueOnce({ error: 'conflict' })
      .mockResolvedValue({ id: 'existing-id' });
    const { api } = getDashboardApi({
      incomingEmbeddables: [],
      initialState: DEFAULT_DASHBOARD_STATE,
      savedObjectId: 'existing-id',
      changeSources: ['agent'],
    });

    await api.runQuickSave();
    await api.runQuickSave();
    await api.runQuickSave();

    expect(getDashboardSavedEvents()).toEqual([
      [
        'dashboard_saved',
        {
          is_new: false,
          is_copy: false,
          change_sources: ['agent'],
          panel_count: 0,
          panel_types: [],
        },
      ],
      ['dashboard_saved', { is_new: false, is_copy: false, panel_count: 0, panel_types: [] }],
    ]);
  });

  test('reports sources set during a quick save on the next quick save', async () => {
    let finishSave = () => {};
    jest
      .mocked(saveDashboard)
      .mockReturnValueOnce(
        new Promise((resolve) => (finishSave = () => resolve({ id: 'existing-id' })))
      )
      .mockResolvedValue({ id: 'existing-id' });
    const { api } = getDashboardApi({
      incomingEmbeddables: [],
      initialState: DEFAULT_DASHBOARD_STATE,
      savedObjectId: 'existing-id',
    });

    const firstSave = api.runQuickSave();
    api.setState(DEFAULT_DASHBOARD_STATE, { changeSources: ['agent'] });
    finishSave();
    await firstSave;
    await api.runQuickSave();

    expect(getDashboardSavedEvents()).toEqual([
      ['dashboard_saved', { is_new: false, is_copy: false, panel_count: 0, panel_types: [] }],
      [
        'dashboard_saved',
        {
          is_new: false,
          is_copy: false,
          change_sources: ['agent'],
          panel_count: 0,
          panel_types: [],
        },
      ],
    ]);
  });

  test('reports sources of a failed overlapping quick save on the next quick save', async () => {
    let finishFirstSave = () => {};
    let failSecondSave = () => {};
    jest
      .mocked(saveDashboard)
      .mockReturnValueOnce(
        new Promise((resolve) => (finishFirstSave = () => resolve({ id: 'existing-id' })))
      )
      .mockReturnValueOnce(
        new Promise((resolve) => (failSecondSave = () => resolve({ error: 'conflict' })))
      )
      .mockResolvedValue({ id: 'existing-id' });
    const { api } = getDashboardApi({
      incomingEmbeddables: [],
      initialState: DEFAULT_DASHBOARD_STATE,
      savedObjectId: 'existing-id',
    });

    const firstSave = api.runQuickSave();
    api.setState(DEFAULT_DASHBOARD_STATE, { changeSources: ['agent'] });
    const secondSave = api.runQuickSave();
    finishFirstSave();
    await firstSave;
    failSecondSave();
    await secondSave;
    await api.runQuickSave();

    expect(getDashboardSavedEvents()).toEqual([
      ['dashboard_saved', { is_new: false, is_copy: false, panel_count: 0, panel_types: [] }],
      [
        'dashboard_saved',
        {
          is_new: false,
          is_copy: false,
          change_sources: ['agent'],
          panel_count: 0,
          panel_types: [],
        },
      ],
    ]);
  });

  test('reports sources set after the save modal serializes state on the next save', async () => {
    jest.mocked(saveDashboard).mockResolvedValue({ id: 'copy-id' });
    jest.mocked(openSaveModal).mockImplementation(({ onSave, serializeState }) => {
      const savedState = serializeState();
      api.setState(DEFAULT_DASHBOARD_STATE, { changeSources: ['agent'] });
      onSave({ id: 'copy-id', savedState });
    });
    const { api } = getDashboardApi({
      incomingEmbeddables: [],
      initialState: DEFAULT_DASHBOARD_STATE,
      savedObjectId: 'existing-id',
    });

    await api.runInteractiveSave();
    await api.runQuickSave();

    expect(getDashboardSavedEvents()).toEqual([
      ['dashboard_saved', { is_new: true, is_copy: true, panel_count: 0, panel_types: [] }],
      [
        'dashboard_saved',
        {
          is_new: false,
          is_copy: false,
          change_sources: ['agent'],
          panel_count: 0,
          panel_types: [],
        },
      ],
    ]);
  });

  describe('with undo and redo', () => {
    const agentSave = [
      'dashboard_saved',
      { is_new: false, is_copy: false, change_sources: ['agent'], panel_count: 0, panel_types: [] },
    ];
    const handSave = [
      'dashboard_saved',
      { is_new: false, is_copy: false, panel_count: 0, panel_types: [] },
    ];

    beforeEach(() => {
      jest.useFakeTimers();
      jest.mocked(saveDashboard).mockResolvedValue({ id: 'existing-id' });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    type Dashboard = ReturnType<typeof getDashboardApi>;
    const settle = () => jest.advanceTimersByTimeAsync(1000);
    const setup = async (changeSources?: string[]) => {
      const dashboard = getDashboardApi({
        incomingEmbeddables: [],
        initialState: DEFAULT_DASHBOARD_STATE,
        savedObjectId: 'existing-id',
        changeSources,
      });
      await settle();
      return dashboard;
    };
    const editByHand = async ({ api }: Dashboard, title: string) => {
      api.setState({ ...api.getSerializedState().attributes, title });
      await settle();
    };
    const editByAgent = async ({ api }: Dashboard, title: string) => {
      api.setState({ ...api.getSerializedState().attributes, title }, { changeSources: ['agent'] });
      await settle();
    };
    const undo = async ({ internalApi }: Dashboard) => {
      await internalApi.undo();
      await settle();
    };
    const redo = async ({ internalApi }: Dashboard) => {
      await internalApi.redo();
      await settle();
    };
    const quickSave = async ({ api }: Dashboard) => {
      await api.runQuickSave();
      await settle();
    };

    test('does not report an agent change undone back to the saved state', async () => {
      const dashboard = await setup();
      await editByAgent(dashboard, 'Agent title');
      await undo(dashboard);
      await quickSave(dashboard);

      expect(dashboard.api.getSettings().title).toBe('');
      expect(getDashboardSavedEvents()).toEqual([handSave]);
    });

    test('reports an undone agent change once it is redone', async () => {
      const dashboard = await setup();
      await editByAgent(dashboard, 'Agent title');
      await undo(dashboard);
      await redo(dashboard);
      await quickSave(dashboard);

      expect(dashboard.api.getSettings().title).toBe('Agent title');
      expect(getDashboardSavedEvents()).toEqual([agentSave]);
    });

    test('does not report an agent change undone back to a hand edit', async () => {
      const dashboard = await setup();
      await editByHand(dashboard, 'Hand title');
      await editByAgent(dashboard, 'Agent title');
      await undo(dashboard);
      await quickSave(dashboard);

      expect(dashboard.api.getSettings().title).toBe('Hand title');
      expect(getDashboardSavedEvents()).toEqual([handSave]);
    });

    test('keeps the sources of the starting state when undoing back to it', async () => {
      const dashboard = await setup(['agent']);
      await editByHand(dashboard, 'Hand title');
      await undo(dashboard);
      await editByHand(dashboard, 'Second hand title');
      await quickSave(dashboard);

      expect(getDashboardSavedEvents()).toEqual([agentSave]);
    });

    test('does not report an agent change already saved when undoing a later hand edit', async () => {
      const dashboard = await setup();
      await editByAgent(dashboard, 'Agent title');
      await quickSave(dashboard);
      await editByHand(dashboard, 'Hand title A');
      await undo(dashboard);
      await editByHand(dashboard, 'Hand title B');
      await quickSave(dashboard);

      expect(dashboard.api.getSettings().title).toBe('Hand title B');
      expect(getDashboardSavedEvents()).toEqual([agentSave, handSave]);
    });

    test('reports agent changes on each save that includes a new one', async () => {
      const dashboard = await setup();
      await editByAgent(dashboard, 'First agent title');
      await quickSave(dashboard);
      await editByAgent(dashboard, 'Second agent title');
      await quickSave(dashboard);

      expect(getDashboardSavedEvents()).toEqual([agentSave, agentSave]);
    });

    test('reports an agent change redone after a save that excluded it', async () => {
      const dashboard = await setup();
      await editByAgent(dashboard, 'Agent title');
      await undo(dashboard);
      await quickSave(dashboard);
      await redo(dashboard);
      await quickSave(dashboard);

      expect(dashboard.api.getSettings().title).toBe('Agent title');
      expect(getDashboardSavedEvents()).toEqual([handSave, agentSave]);
    });

    test('does not add an undo step for an agent change that changes nothing', async () => {
      const dashboard = await setup();
      await editByHand(dashboard, 'Hand title');
      dashboard.api.setState(dashboard.api.getSerializedState().attributes, {
        changeSources: ['agent'],
      });
      await settle();
      await undo(dashboard);

      expect(dashboard.api.getSettings().title).toBe('');
      expect(dashboard.internalApi.canUndo$.value).toBe(false);
    });
  });

  test('reports an interactive save of an existing dashboard as a new copy with setState sources', async () => {
    jest.mocked(openSaveModal).mockImplementation(({ onSave, serializeState }) => {
      onSave({ id: 'copy-id', savedState: serializeState() });
    });
    const { api } = getDashboardApi({
      incomingEmbeddables: [],
      initialState: DEFAULT_DASHBOARD_STATE,
      savedObjectId: 'existing-id',
    });

    api.setState(DEFAULT_DASHBOARD_STATE, { changeSources: ['agent'] });
    await api.runInteractiveSave();

    expect(getDashboardSavedEvents()).toEqual([
      [
        'dashboard_saved',
        {
          is_new: true,
          is_copy: true,
          change_sources: ['agent'],
          panel_count: 0,
          panel_types: [],
        },
      ],
    ]);
  });
});
