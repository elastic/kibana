/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '../../common/types';
import { getDashboardApi } from './get_dashboard_api';
import { coreServices } from '../services/kibana_services';
import { openSaveModal } from './save_modal/open_save_modal';
import { saveDashboard } from './save_modal/save_dashboard';

jest.mock('./save_modal/open_save_modal', () => ({
  openSaveModal: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./save_modal/save_dashboard', () => ({
  saveDashboard: jest.fn().mockResolvedValue(undefined),
}));

describe('dashboard panel limit save guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks interactive save and shows a danger toast when invalid', async () => {
    const initialState = {
      title: 'Test',
      panels: Array.from({ length: 101 }, (_, i) => ({
        id: `p-${i}`,
        type: 'testPanel',
        grid: { x: 0, y: i, w: 1, h: 1 },
        config: {},
      })),
      pinned_panels: [],
    } as unknown as DashboardState;

    const { api } = getDashboardApi({
      incomingEmbeddables: [],
      initialState,
    });

    await api.runInteractiveSave();

    expect(coreServices.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
    expect(openSaveModal).not.toHaveBeenCalled();
  });

  it('blocks quick save and shows a danger toast when invalid', async () => {
    const initialState = {
      title: 'Test',
      panels: Array.from({ length: 101 }, (_, i) => ({
        id: `p-${i}`,
        type: 'testPanel',
        grid: { x: 0, y: i, w: 1, h: 1 },
        config: {},
      })),
      pinned_panels: [],
    } as unknown as DashboardState;

    const { api } = getDashboardApi({
      incomingEmbeddables: [],
      initialState,
      savedObjectId: 'existing',
    });

    // ensure quick save is enabled
    (api.savedObjectId$ as unknown as { next: (id: string) => void }).next('existing');

    await api.runQuickSave();

    expect(coreServices.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
    expect(saveDashboard).not.toHaveBeenCalled();
  });
});
