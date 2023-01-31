/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObject } from '@kbn/core-saved-objects-server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { importDashboards } from './import_dashboards';

describe('importDashboards(req)', () => {
  let savedObjectClient: ReturnType<typeof savedObjectsClientMock.create>;
  let importedObjects: SavedObject[];

  beforeEach(() => {
    savedObjectClient = savedObjectsClientMock.create();
    savedObjectClient.bulkCreate.mockResolvedValue({ saved_objects: [] });

    importedObjects = [
      {
        id: 'dashboard-01',
        type: 'dashboard',
        attributes: { panelJSON: '{}' },
        references: [],
        version: 'foo',
      },
      { id: 'panel-01', type: 'visualization', attributes: { visState: '{}' }, references: [] },
    ];
  });

  test('should call bulkCreate with each asset, filtering out any version if present', async () => {
    await importDashboards(savedObjectClient, importedObjects, { overwrite: false, exclude: [] });

    expect(savedObjectClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(savedObjectClient.bulkCreate).toHaveBeenCalledWith(
      [
        {
          id: 'dashboard-01',
          type: 'dashboard',
          attributes: { panelJSON: '{}' },
          references: [],
          migrationVersion: {},
        },
        {
          id: 'panel-01',
          type: 'visualization',
          attributes: { visState: '{}' },
          references: [],
          migrationVersion: {},
        },
      ],
      { overwrite: false }
    );
  });

  test('should call bulkCreate with overwrite true if force is truthy', async () => {
    await importDashboards(savedObjectClient, importedObjects, { overwrite: true, exclude: [] });

    expect(savedObjectClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(savedObjectClient.bulkCreate).toHaveBeenCalledWith(expect.any(Array), {
      overwrite: true,
    });
  });

  test('should exclude types based on exclude argument', async () => {
    await importDashboards(savedObjectClient, importedObjects, {
      overwrite: false,
      exclude: ['visualization'],
    });

    expect(savedObjectClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(savedObjectClient.bulkCreate).toHaveBeenCalledWith(
      [
        {
          id: 'dashboard-01',
          type: 'dashboard',
          attributes: { panelJSON: '{}' },
          references: [],
          migrationVersion: {},
        },
      ],
      { overwrite: false }
    );
  });
});
