/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSampleDashboardState } from '../../../mocks';
import { contentManagementService, coreServices } from '../../kibana_services';
import { saveDashboardState } from './save_dashboard_state';
import type { DashboardPanel } from '../../../../server';

contentManagementService.client.create = jest.fn().mockImplementation(({ options }) => {
  if (options.id === undefined) {
    return { item: { id: 'newlyGeneratedId' } };
  }

  throw new Error('Update should be used when id is provided');
});

contentManagementService.client.update = jest.fn().mockImplementation(({ id }) => {
  if (id === undefined) {
    throw new Error('Update needs an id');
  }
  return { item: { id } };
});

describe('Save dashboard state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should save the dashboard using the same ID', async () => {
    const result = await saveDashboardState({
      dashboardState: {
        ...getSampleDashboardState(),
        title: 'BOO',
      },
      lastSavedId: 'Boogaloo',
      saveOptions: {},
    });

    expect(result.id).toBe('Boogaloo');
    expect(contentManagementService.client.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'Boogaloo' })
    );
    expect(coreServices.notifications.toasts.addSuccess).toHaveBeenCalledWith({
      title: `Dashboard 'BOO' was saved`,
      className: 'eui-textBreakWord',
      'data-test-subj': 'saveDashboardSuccess',
    });
  });

  it('should save the dashboard using a new id, and return redirect required', async () => {
    const result = await saveDashboardState({
      dashboardState: {
        ...getSampleDashboardState(),
        title: 'BooToo',
      },
      lastSavedId: 'Boogaloonie',
      saveOptions: { saveAsCopy: true },
    });

    expect(result.id).toBe('newlyGeneratedId');
    expect(result.redirectRequired).toBe(true);
    expect(contentManagementService.client.create).toHaveBeenCalled();
    expect(coreServices.notifications.toasts.addSuccess).toHaveBeenCalled();
  });

  it('should generate new panel IDs for dashboard panels when save as copy is true', async () => {
    const result = await saveDashboardState({
      dashboardState: {
        ...getSampleDashboardState(),
        title: 'BooThree',
        panels: [{ type: 'boop', uid: 'idOne' } as DashboardPanel],
      },
      lastSavedId: 'Boogatoonie',
      saveOptions: { saveAsCopy: true },
    });

    expect(result.id).toBe('newlyGeneratedId');

    expect(contentManagementService.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          panels: expect.arrayContaining([
            expect.objectContaining({
              uid: expect.not.stringContaining('aVerySpecialVeryUniqueId'),
            }),
          ]),
        }),
      })
    );
  });

  it('should include accessControl when creating a new dashboard but not when updating', async () => {
    const createResult = await saveDashboardState({
      dashboardState: {
        ...getSampleDashboardState(),
        title: 'New Dashboard',
      },
      saveOptions: { saveAsCopy: true },
      accessMode: 'write_restricted',
    });

    expect(createResult.id).toBe('newlyGeneratedId');
    expect(contentManagementService.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          accessControl: {
            accessMode: 'write_restricted',
          },
        }),
      })
    );

    jest.clearAllMocks();

    const updateResult = await saveDashboardState({
      dashboardState: {
        ...getSampleDashboardState(),
        title: 'Updated Dashboard',
      },
      lastSavedId: 'existing-dashboard-id',
      saveOptions: {},
      accessMode: 'write_restricted', // Should be ignored for updates
    });

    expect(updateResult.id).toBe('existing-dashboard-id');
    expect(contentManagementService.client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'existing-dashboard-id',
        options: expect.objectContaining({
          mergeAttributes: false,
        }),
      })
    );

    // Verify that accessControl is not included in update options
    const updateCall = (contentManagementService.client.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.options).not.toHaveProperty('accessControl');
  });

  it('should return an error when the save fails.', async () => {
    contentManagementService.client.create = jest.fn().mockRejectedValue('Whoops');
    const result = await saveDashboardState({
      dashboardState: {
        ...getSampleDashboardState(),
        title: 'BooThree',
        panels: [{ type: 'boop', uid: 'idOne' } as DashboardPanel],
      },
      lastSavedId: 'Boogatoonie',
      saveOptions: { saveAsCopy: true },
    });

    expect(result.id).toBeUndefined();
    expect(result.error).toBe('Whoops');
  });
});
