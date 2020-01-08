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

import _ from 'lodash';
import expect from '@kbn/expect';
import sinon from 'sinon';
import { aggResponseIndex } from '../../../agg_response';
import { vislibSeriesResponseHandlerProvider as vislibReponseHandler } from '../../response_handlers/vislib';

describe('renderbot#buildChartData', function() {
  const buildChartData = vislibReponseHandler().handler;

  describe('for hierarchical vis', function() {
    it('defers to hierarchical aggResponse converter', function() {
      const football = {};
      const renderbot = {
        vis: {
          isHierarchical: _.constant(true),
        },
      };

      const stub = sinon.stub(aggResponseIndex, 'hierarchical').returns(football);
      expect(buildChartData.call(renderbot, football)).to.be(football);
      expect(stub).to.have.property('callCount', 1);
      expect(stub.firstCall.args[0]).to.be(renderbot.vis);
      expect(stub.firstCall.args[1]).to.be(football);
    });
  });

  describe('for point plot', function() {
    it('calls tabify to simplify the data into a table', function() {
      const renderbot = {
        vis: {
          isHierarchical: _.constant(false),
        },
      };
      const football = { tables: [], hits: { total: 1 } };

      const stub = sinon.stub(aggResponseIndex, 'tabify').returns(football);
      expect(buildChartData.call(renderbot, football)).to.eql({ rows: [], hits: 1 });
      expect(stub).to.have.property('callCount', 1);
      expect(stub.firstCall.args[0]).to.be(renderbot.vis);
      expect(stub.firstCall.args[1]).to.be(football);
    });

    it('returns a single chart if the tabify response contains only a single table', function() {
      const chart = { hits: 1, rows: [], columns: [] };
      const renderbot = {
        vis: {
          isHierarchical: _.constant(false),
          type: {
            responseConverter: _.constant(chart),
          },
        },
      };
      const esResp = { hits: { total: 1 } };
      const tabbed = { tables: [{}] };

      sinon.stub(aggResponseIndex, 'tabify').returns(tabbed);
      expect(buildChartData.call(renderbot, esResp)).to.eql(chart);
    });

    it('converts table groups into rows/columns wrappers for charts', function() {
      const converter = sinon.stub().returns('chart');
      const esResp = { hits: { total: 1 } };
      const tables = [{}, {}, {}, {}];

      const renderbot = {
        vis: {
          isHierarchical: _.constant(false),
          type: {
            responseConverter: converter,
          },
        },
      };

      sinon.stub(aggResponseIndex, 'tabify').returns({
        tables: [
          {
            aggConfig: { params: { row: true } },
            tables: [
              {
                aggConfig: { params: { row: false } },
                tables: [tables[0]],
              },
              {
                aggConfig: { params: { row: false } },
                tables: [tables[1]],
              },
            ],
          },
          {
            aggConfig: { params: { row: true } },
            tables: [
              {
                aggConfig: { params: { row: false } },
                tables: [tables[2]],
              },
              {
                aggConfig: { params: { row: false } },
                tables: [tables[3]],
              },
            ],
          },
        ],
      });

      const chartData = buildChartData.call(renderbot, esResp);

      // verify tables were converted
      expect(converter).to.have.property('callCount', 4);
      expect(converter.args[0][1]).to.be(tables[0]);
      expect(converter.args[1][1]).to.be(tables[1]);
      expect(converter.args[2][1]).to.be(tables[2]);
      expect(converter.args[3][1]).to.be(tables[3]);

      expect(chartData).to.have.property('rows');
      expect(chartData.rows).to.have.length(2);
      chartData.rows.forEach(function(row) {
        expect(row).to.have.property('columns');
        expect(row.columns).to.eql(['chart', 'chart']);
      });
    });
  });
});
