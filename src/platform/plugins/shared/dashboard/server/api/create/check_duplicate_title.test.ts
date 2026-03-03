/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { dashboardTitleExists } from './check_duplicate_title';

describe('dashboardTitleExists', () => {
  it('returns false when title is empty', async () => {
    const client = savedObjectsClientMock.create();
    expect(await dashboardTitleExists(client, '')).toBe(false);
    expect(await dashboardTitleExists(client, '   ')).toBe(false);
    expect(client.find).not.toHaveBeenCalled();
  });

  it('returns false when no dashboard has the same title', async () => {
    const client = savedObjectsClientMock.create();
    client.find.mockResolvedValue({
      saved_objects: [
        { id: '1', type: 'dashboard', attributes: { title: 'Other Dashboard' }, references: [] },
      ],
      page: 1,
      per_page: 20,
      total: 1,
    });

    expect(await dashboardTitleExists(client, 'My Dashboard')).toBe(false);
    expect(client.find).toHaveBeenCalledTimes(1);
  });

  it('returns true when a dashboard has the exact same title', async () => {
    const client = savedObjectsClientMock.create();
    client.find.mockResolvedValue({
      saved_objects: [
        {
          id: '1',
          type: 'dashboard',
          attributes: { title: 'Markdown embeddable schema demo' },
          references: [],
        },
      ],
      page: 1,
      per_page: 20,
      total: 1,
    });

    expect(await dashboardTitleExists(client, 'Markdown embeddable schema demo')).toBe(true);
    expect(client.find).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'dashboard',
        search: 'Markdown embeddable schema demo',
        perPage: 20,
      })
    );
  });

  it('uses base title for search when title has copy suffix (e.g. "My Dashboard (2)")', async () => {
    const client = savedObjectsClientMock.create();
    client.find.mockResolvedValue({
      saved_objects: [
        {
          id: '1',
          type: 'dashboard',
          attributes: { title: 'My Dashboard (2)' },
          references: [],
        },
      ],
      page: 1,
      per_page: 20,
      total: 1,
    });

    expect(await dashboardTitleExists(client, 'My Dashboard (2)')).toBe(true);
    expect(client.find).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'My Dashboard',
      })
    );
  });
});
