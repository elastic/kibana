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

import $ from 'jquery';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';

import { setupAndTeardownInjectorStub } from 'test_utils/stub_get_active_injector';

import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

import { VisProvider } from '../../../vis';
import { visualizationLoader } from '../visualization_loader';

describe('visualization loader', () => {
  let vis;

  beforeEach(ngMock.module('kibana', 'kibana/directive'));
  beforeEach(
    ngMock.inject((_$rootScope_, savedVisualizations, Private) => {
      const indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);

      // Create a new Vis object
      const Vis = Private(VisProvider);
      vis = new Vis(indexPattern, {
        type: 'markdown',
        params: { markdown: 'this is test' },
      });
    })
  );
  setupAndTeardownInjectorStub();

  it('should render visualization', async () => {
    const element = document.createElement('div');
    expect(visualizationLoader.render).to.be.a('function');
    visualizationLoader.render(element, vis, null, vis.params);
    expect($(element).find('.visualization').length).to.be(1);
  });
});
