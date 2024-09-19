/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DashboardContainerInput } from '../../../../common';
import { getSampleDashboardInput } from '../../../mocks';
import { coreServices } from '../../kibana_services';
import { pluginServices } from '../../plugin_services';
import { registry } from '../../plugin_services.stub';
import { saveDashboardState } from './save_dashboard_state';

pluginServices.setRegistry(registry.start({}));
const {
  data,
  embeddable,
  dashboardBackup,
  contentManagement,
  initializerContext,
  savedObjectsTagging,
} = pluginServices.getServices();

contentManagement.client.create = jest.fn().mockImplementation(({ options }) => {
  if (options.id === undefined) {
    return { item: { id: 'newlyGeneratedId' } };
  }

  throw new Error('Update should be used when id is provided');
});

contentManagement.client.update = jest.fn().mockImplementation(({ id }) => {
  if (id === undefined) {
    throw new Error('Update needs an id');
  }
  return { item: { id } };
});

const allServices = {
  data,
  embeddable,
  dashboardBackup,
  contentManagement,
  initializerContext,
  savedObjectsTagging,
};
data.query.timefilter.timefilter.getTime = jest.fn().mockReturnValue({ from: 'then', to: 'now' });
embeddable.extract = jest
  .fn()
  .mockImplementation((attributes) => ({ state: attributes, references: [] }));

describe('Save dashboard state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should save the dashboard using the same ID', async () => {
    const result = await saveDashboardState({
      currentState: {
        ...getSampleDashboardInput(),
        title: 'BOO',
      } as unknown as DashboardContainerInput,
      lastSavedId: 'Boogaloo',
      saveOptions: {},
      ...allServices,
    });

    expect(result.id).toBe('Boogaloo');
    expect(allServices.contentManagement.client.update).toHaveBeenCalledWith(
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
      currentState: {
        ...getSampleDashboardInput(),
        title: 'BooToo',
      } as unknown as DashboardContainerInput,
      lastSavedId: 'Boogaloonie',
      saveOptions: { saveAsCopy: true },
      ...allServices,
    });

    expect(result.id).toBe('newlyGeneratedId');
    expect(result.redirectRequired).toBe(true);
    expect(allServices.contentManagement.client.create).toHaveBeenCalledWith(
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
      currentState: {
        ...getSampleDashboardInput(),
        title: 'BooThree',
        panels: { idOne: { type: 'boop' } },
      } as unknown as DashboardContainerInput,
      lastSavedId: 'Boogatoonie',
      saveOptions: { saveAsCopy: true },
      ...allServices,
    });

    expect(result.id).toBe('newlyGeneratedId');

    expect(allServices.contentManagement.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          panelsJSON: expect.not.stringContaining('neverGonnaGetThisId'),
        }),
      })
    );
  });

  it('should update prefixes on references when save as copy is true', async () => {
    const result = await saveDashboardState({
      currentState: {
        ...getSampleDashboardInput(),
        title: 'BooFour',
        panels: { idOne: { type: 'boop' } },
      } as unknown as DashboardContainerInput,
      panelReferences: [{ name: 'idOne:panel_idOne', type: 'boop', id: 'idOne' }],
      lastSavedId: 'Boogatoonie',
      saveOptions: { saveAsCopy: true },
      ...allServices,
    });

    expect(result.id).toBe('newlyGeneratedId');
    expect(allServices.contentManagement.client.create).toHaveBeenCalledWith(
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
    contentManagement.client.create = jest.fn().mockRejectedValue('Whoops');
    const result = await saveDashboardState({
      currentState: {
        ...getSampleDashboardInput(),
        title: 'BooThree',
        panels: { idOne: { type: 'boop' } },
      } as unknown as DashboardContainerInput,
      lastSavedId: 'Boogatoonie',
      saveOptions: { saveAsCopy: true },
      ...allServices,
    });

    expect(result.id).toBeUndefined();
    expect(result.error).toBe('Whoops');
  });
});
