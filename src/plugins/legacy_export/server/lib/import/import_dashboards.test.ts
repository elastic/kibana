/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { savedObjectsClientMock } from '../../../../../core/server/mocks';
import { SavedObject } from '../../../../../core/server';
import { importDashboards } from './import_dashboards';

describe('importDashboards(req)', () => {
  let savedObjectClient: ReturnType<typeof savedObjectsClientMock.create>;
  let importedObjects: SavedObject[];

  beforeEach(() => {
    savedObjectClient = savedObjectsClientMock.create();
    savedObjectClient.bulkCreate.mockResolvedValue({ saved_objects: [] });

    importedObjects = [
      { id: 'dashboard-01', type: 'dashboard', attributes: { panelJSON: '{}' }, references: [] },
      { id: 'panel-01', type: 'visualization', attributes: { visState: '{}' }, references: [] },
    ];
  });

  test('should call bulkCreate with each asset', async () => {
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
