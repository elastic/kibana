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

import ngMock from 'ng_mock';
import expect from 'expect.js';

import MockState from 'fixtures/mock_state';
import { toastNotifications } from '../../notify';
import AggConfigResult from '../../vis/agg_config_result';

import { VisProvider } from '../../vis';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { FilterBarClickHandlerProvider } from '../filter_bar_click_handler';

describe('filterBarClickHandler', function () {
  let setup = null;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    setup = function () {
      const Vis = Private(VisProvider);
      const createClickHandler = Private(FilterBarClickHandlerProvider);
      const indexPattern = Private(StubbedLogstashIndexPatternProvider);

      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          { type: 'count', schema: 'metric' },
          {
            type: 'terms',
            schema: 'segment',
            params: { field: 'non-filterable' }
          }
        ]
      });
      const aggConfigResult = new AggConfigResult(vis.aggs[1], void 0, 'apache', 'apache');

      const $state = new MockState({ filters: [] });
      const clickHandler = createClickHandler($state);

      return { clickHandler, $state, aggConfigResult };
    };
  }));

  beforeEach(function () {
    toastNotifications.list.splice(0);
  });

  describe('on non-filterable fields', function () {
    it('warns about trying to filter on a non-filterable field', function () {
      const { clickHandler, aggConfigResult } = setup();
      expect(toastNotifications.list).to.have.length(0);
      clickHandler({ point: { aggConfigResult } });
      expect(toastNotifications.list).to.have.length(1);
    });

    it('does not warn if the event is click is being simulated', function () {
      const { clickHandler, aggConfigResult } = setup();
      expect(toastNotifications.list).to.have.length(0);
      clickHandler({ point: { aggConfigResult } }, true);
      expect(toastNotifications.list).to.have.length(0);
    });
  });
});
