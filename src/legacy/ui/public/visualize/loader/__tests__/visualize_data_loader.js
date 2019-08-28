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
import ngMock from 'ng_mock';

import { setupAndTeardownInjectorStub } from 'test_utils/stub_get_active_injector';

import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

import { VisProvider } from '../../../vis';
import { VisualizeDataLoader } from '../visualize_data_loader';

describe('visualize data loader', () => {

  let visualizeDataLoader;

  beforeEach(ngMock.module('kibana', 'kibana/directive'));
  beforeEach(ngMock.inject((Private) => {
    const indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    const Vis = Private(VisProvider);

    // Create a new Vis object
    const vis = new Vis(indexPattern, {
      type: 'pie',
      params: {},
      aggs: [
        { type: 'count', schema: 'metric' },
        {
          type: 'range',
          schema: 'bucket',
          params: {
            field: 'bytes',
            ranges: [
              { from: 0, to: 1000 },
              { from: 1000, to: 2000 }
            ]
          }
        }
      ]
    });

    visualizeDataLoader = new VisualizeDataLoader(vis, Private);
  }));
  setupAndTeardownInjectorStub();

  describe('fetch', () => {
    it('should be a function', () => {
      expect(visualizeDataLoader.fetch).to.be.a('function');
    });
  });
});
