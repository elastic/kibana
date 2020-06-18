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

import { importDashboards } from './import_dashboards';
import sinon from 'sinon';

describe('importDashboards(req)', () => {
  let req;
  let bulkCreateStub;
  beforeEach(() => {
    bulkCreateStub = sinon.stub().returns(Promise.resolve({ saved_objects: [] }));
    req = {
      query: {},
      payload: {
        version: '6.0.0',
        objects: [
          { id: 'dashboard-01', type: 'dashboard', attributes: { panelJSON: '{}' } },
          { id: 'panel-01', type: 'visualization', attributes: { visState: '{}' } },
        ],
      },
      getSavedObjectsClient() {
        return {
          bulkCreate: bulkCreateStub,
        };
      },
    };
  });

  test('should call bulkCreate with each asset', () => {
    return importDashboards(req).then(() => {
      expect(bulkCreateStub.calledOnce).toEqual(true);
      expect(bulkCreateStub.args[0][0]).toEqual([
        {
          id: 'dashboard-01',
          type: 'dashboard',
          attributes: { panelJSON: '{}' },
          migrationVersion: {},
        },
        {
          id: 'panel-01',
          type: 'visualization',
          attributes: { visState: '{}' },
          migrationVersion: {},
        },
      ]);
    });
  });

  test('should call bulkCreate with overwrite true if force is truthy', () => {
    req.query = { force: 'true' };
    return importDashboards(req).then(() => {
      expect(bulkCreateStub.calledOnce).toEqual(true);
      expect(bulkCreateStub.args[0][1]).toEqual({ overwrite: true });
    });
  });

  test('should exclude types based on exclude argument', () => {
    req.query = { exclude: 'visualization' };
    return importDashboards(req).then(() => {
      expect(bulkCreateStub.calledOnce).toEqual(true);
      expect(bulkCreateStub.args[0][0]).toEqual([
        {
          id: 'dashboard-01',
          type: 'dashboard',
          attributes: { panelJSON: '{}' },
          migrationVersion: {},
        },
      ]);
    });
  });
});
