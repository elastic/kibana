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

import { values } from 'lodash';
import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import resp from 'fixtures/agg_resp/range';
import { VisProvider } from '../../../vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

describe('Range Agg', function() {
  const buckets = values(resp.aggregations[1].buckets);

  let Vis;
  let indexPattern;

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function(Private) {
      Vis = Private(VisProvider);
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
      indexPattern.stubSetFieldFormat('bytes', 'bytes', {
        pattern: '0,0.[000] b',
      });
    })
  );

  describe('formating', function() {
    it('formats bucket keys properly', function() {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'range',
            schema: 'segment',
            params: {
              field: 'bytes',
              ranges: [{ from: 0, to: 1000 }, { from: 1000, to: 2000 }],
            },
          },
        ],
      });

      const agg = vis.aggs.byName('range')[0];
      const format = function(val) {
        return agg.fieldFormatter()(agg.getKey(val));
      };
      expect(format(buckets[0])).to.be('≥ -∞ and < 1 KB');
      expect(format(buckets[1])).to.be('≥ 1 KB and < 2.5 KB');
      expect(format(buckets[2])).to.be('≥ 2.5 KB and < +∞');
    });
  });
});
