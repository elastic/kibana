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

import * as deps from '../collect_dashboards';
import { exportDashboards } from '../export_dashboards';
import sinon from 'sinon';
import { expect } from 'chai';

describe('exportDashboards(req)', () => {

  let req;
  let collectDashboardsStub;

  beforeEach(() => {
    req = {
      query: { dashboard: 'dashboard-01' },
      server: {
        config: () => ({ get: () => '6.0.0' }),
        plugins: {
          elasticsearch: {
            getCluster: () => ({ callWithRequest: sinon.stub() })
          }
        },
      },
      getSavedObjectsClient() {
        return null;
      }
    };

    collectDashboardsStub = sinon.stub(deps, 'collectDashboards');
    collectDashboardsStub.returns(Promise.resolve([
      { id: 'dasboard-01' },
      { id: 'logstash-*' },
      { id: 'panel-01' }
    ]));
  });

  afterEach(() => {
    collectDashboardsStub.restore();
  });

  it('should return a response object with version', () => {
    return exportDashboards(req).then((resp) => {
      expect(resp).to.have.property('version', '6.0.0');
    });
  });

  it('should return a response object with objects', () => {
    return exportDashboards(req).then((resp) => {
      expect(resp).to.have.property('objects');
      expect(resp.objects).to.eql([
        { id: 'dasboard-01' },
        { id: 'logstash-*' },
        { id: 'panel-01' }
      ]);
    });
  });
});
