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

import moment from 'moment';
import { coreMock } from '../../../../core/public/mocks';
import { dataPluginMock } from '../../../data/public/mocks';
import { getTimelionRequestHandler } from './timelion_request_handler';

describe('Timelion request handler', function () {
  const core = coreMock.createStart();
  const data = dataPluginMock.createStartContract();
  let timelionRequestHandler: any;

  beforeEach(function () {
    core.http.post
      .mockReturnValueOnce(Promise.resolve({ response: { status: 202 }, body: { id: 'test' } }))
      .mockReturnValueOnce(
        Promise.resolve({ response: { status: 200 }, body: { sheet: [{ list: ['es'] }] } })
      );

    data.query.timefilter.timefilter.calculateBounds = () => {
      return { min: moment(), max: moment() };
    };
    timelionRequestHandler = getTimelionRequestHandler({
      uiSettings: core.uiSettings,
      http: core.http,
      timefilter: data.query.timefilter.timefilter,
    });
  });

  it('checking polling', async function () {
    const resp = await timelionRequestHandler({
      timeRange: {},
      filters: [],
      query: { query: 'es' },
      visParams: { expression: 'es' },
    });
    expect(core.http.post).toHaveBeenCalledTimes(2);
    expect(resp).toEqual({ sheet: [{ list: ['es'] }] });
  });
});
