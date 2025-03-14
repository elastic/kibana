/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSampleDashboardState } from '../../../mocks';
import {
  contentManagementService,
  coreServices,
  dataService,
  embeddableService,
} from '../../kibana_services';
import { saveDashboardState } from './save_dashboard_state';
import { DashboardPanelMap } from '../../../../common/dashboard_container/types';

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

dataService.query.timefilter.timefilter.getTime = jest
  .fn()
  .mockReturnValue({ from: 'then', to: 'now' });

embeddableService.extract = jest
  .fn()
  .mockImplementation((attributes) => ({ state: attributes, references: [] }));

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
    expect(contentManagementService.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { references: [] },
      })
    );
    expect(coreServices.notifications.toasts.addSuccess).toHaveBeenCalledWith({
      title: `Dashboard 'BooToo' was saved`,
      className: 'eui-textBreakWord',
      'data-test-subj': 'saveDashboardSuccess',
    });
  });

  it('should generate new panel IDs for dashboard panels when save as copy is true', async () => {
    const result = await saveDashboardState({
      dashboardState: {
        ...getSampleDashboardState(),
        title: 'BooThree',
        panels: { aVerySpecialVeryUniqueId: { type: 'boop' } } as unknown as DashboardPanelMap,
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
              panelIndex: expect.not.stringContaining('aVerySpecialVeryUniqueId'),
            }),
          ]),
        }),
      })
    );
  });

  it('should update prefixes on references when save as copy is true', async () => {
    const result = await saveDashboardState({
      dashboardState: {
        ...getSampleDashboardState(),
        title: 'BooFour',
        panels: { idOne: { type: 'boop' } } as unknown as DashboardPanelMap,
      },
      panelReferences: [{ name: 'idOne:panel_idOne', type: 'boop', id: 'idOne' }],
      lastSavedId: 'Boogatoonie',
      saveOptions: { saveAsCopy: true },
    });

    expect(result.id).toBe('newlyGeneratedId');
    expect(contentManagementService.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          references: expect.arrayContaining([
            expect.objectContaining({
              id: 'idOne',
              name: expect.not.stringContaining('idOne:panel_idOne'),
            }),
          ]),
        }),
      })
    );
  });

  it('should return an error when the save fails.', async () => {
    contentManagementService.client.create = jest.fn().mockRejectedValue('Whoops');
    const result = await saveDashboardState({
      dashboardState: {
        ...getSampleDashboardState(),
        title: 'BooThree',
        panels: { idOne: { type: 'boop' } } as unknown as DashboardPanelMap,
      },
      lastSavedId: 'Boogatoonie',
      saveOptions: { saveAsCopy: true },
    });

    expect(result.id).toBeUndefined();
    expect(result.error).toBe('Whoops');
  });
});
