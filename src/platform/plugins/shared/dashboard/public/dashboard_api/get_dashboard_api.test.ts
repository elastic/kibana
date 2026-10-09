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
