/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSampleDashboardState } from '../../mocks';
import { coreServices } from '../../services/kibana_services';
import { saveDashboard } from './save_dashboard';
import type { DashboardState } from '../../../server';

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
jest.mock('../../dashboard_client', () => ({
  dashboardClient: {
    create: (dashboardState: DashboardState) => mockCreate(dashboardState),
    update: (id: string, dashboardState: DashboardState) => mockUpdate(id, dashboardState),
  },
}));

describe('Save dashboard state', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should save the dashboard using the same ID', async () => {
    mockUpdate.mockResolvedValue({ id: 'Boogaloo' });
    const dashboardState = {
      ...getSampleDashboardState(),
      title: 'BOO',
    };
    const result = await saveDashboard({
      dashboardState,
      lastSavedId: 'Boogaloo',
      saveOptions: {},
    });

    expect(result.id).toBe('Boogaloo');
    expect(mockUpdate).toHaveBeenCalledWith('Boogaloo', dashboardState);
    expect(coreServices.notifications.toasts.addSuccess).toHaveBeenCalledWith({
      title: `Dashboard 'BOO' was saved`,
      className: 'eui-textBreakWord',
      'data-test-subj': 'saveDashboardSuccess',
    });
  });

  it('should save the dashboard using a new id, and return redirect required', async () => {
    mockCreate.mockResolvedValue({ id: 'newlyGeneratedId' });
    const result = await saveDashboard({
      dashboardState: {
        ...getSampleDashboardState(),
        title: 'BooToo',
      },
      lastSavedId: 'Boogaloonie',
      saveOptions: { saveAsCopy: true },
    });

    expect(result.id).toBe('newlyGeneratedId');
    expect(result.redirectRequired).toBe(true);
    expect(mockCreate).toHaveBeenCalled();
    expect(coreServices.notifications.toasts.addSuccess).toHaveBeenCalled();
  });

  it('should return an error when the save fails.', async () => {
    mockCreate.mockRejectedValue('Whoops');
    const result = await saveDashboard({
      dashboardState: {
        ...getSampleDashboardState(),
        title: 'BooThree',
      },
      lastSavedId: 'Boogatoonie',
      saveOptions: { saveAsCopy: true },
    });

    expect(result.id).toBeUndefined();
    expect(result.error).toBe('Whoops');
  });
});
