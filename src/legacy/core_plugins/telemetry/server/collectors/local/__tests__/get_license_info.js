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

import {
  getXPackLicense,
} from '../get_license_info';

function mockGetXPackLicense(callCluster, license, req) {
  callCluster.withArgs(req, 'transport.request', {
    method: 'GET',
    path: '/_license',
    query: {
      local: 'true'
    }
  })
    .returns(license.then(response => ({ license: response })));

  callCluster.withArgs('transport.request', {
    method: 'GET',
    path: '/_license',
    query: {
      local: 'true'
    }
  })
    // conveniently wraps the passed in license object as { license: response }, like it really is
    .returns(license.then(response => ({ license: response })));
}


describe('getXPackLicense', () => {


  it('returns the formatted response object', async () => {
    const license = { fancy: 'license' };


    const callCluster = sinon.stub();

    mockGetXPackLicense(callCluster, Promise.resolve(license));

    const data = await getXPackLicense(callCluster);

    expect(data).to.eql(license);
  });

  it('returns empty object upon license failure', async () => {
    const callCluster = sinon.stub();

    mockGetXPackLicense(callCluster, Promise.reject(new Error()), Promise.resolve({ also: 'fancy' }));

    const data = await getXPackLicense(callCluster);

    expect(data).to.eql({ });
  });

});
