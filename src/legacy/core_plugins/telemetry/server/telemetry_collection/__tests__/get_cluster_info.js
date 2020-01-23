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

import expect from '@kbn/expect';
import sinon from 'sinon';

import { getClusterInfo } from '../get_cluster_info';

export function mockGetClusterInfo(callCluster, clusterInfo, req) {
  callCluster.withArgs(req, 'info').returns(clusterInfo);
  callCluster.withArgs('info').returns(clusterInfo);
}

describe('get_cluster_info', () => {
  it('uses callCluster to get info API', () => {
    const callCluster = sinon.stub();
    const response = Promise.resolve({});

    mockGetClusterInfo(callCluster, response);

    expect(getClusterInfo(callCluster)).to.be(response);
  });
});
