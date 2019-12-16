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

import { fetchTelemetry } from '../fetch_telemetry';

describe('fetch_telemetry', () => {
  it('fetchTelemetry calls expected URL with 20 minutes - now', () => {
    const response = Promise.resolve();
    const $http = {
      post: sinon.stub(),
    };
    const basePath = 'fake';
    const moment = {
      subtract: sinon.stub(),
      toISOString: () => 'max123',
    };

    moment.subtract.withArgs(20, 'minutes').returns({
      toISOString: () => 'min456',
    });

    $http.post
      .withArgs(`fake/api/telemetry/v2/clusters/_stats`, {
        unencrypted: true,
        timeRange: {
          min: 'min456',
          max: 'max123',
        },
      })
      .returns(response);

    expect(fetchTelemetry($http, { basePath, _moment: () => moment, unencrypted: true })).to.be(
      response
    );
  });
});
