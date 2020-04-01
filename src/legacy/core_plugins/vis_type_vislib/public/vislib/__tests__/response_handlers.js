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

import sinon from 'sinon';
import ngMock from 'ng_mock';
import expect from '@kbn/expect';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { aggResponseIndex } from 'ui/agg_response';

import { vislibSeriesResponseHandler } from '../response_handler';

/**
 * TODO: Fix these tests if still needed
 *
 * All these tests were not being run in master or prodiced false positive results
 * Fixing them would require changes to the response handler logic.
 */

describe.skip('Basic Response Handler', function() {
  beforeEach(ngMock.module('kibana'));

  it('returns empty object if conversion failed', () => {
    const data = vislibSeriesResponseHandler({});
    expect(data).to.not.be.an('undefined');
    expect(data).to.equal({});
  });

  it('returns empty object if no data was found', () => {
    const data = vislibSeriesResponseHandler({
      columns: [{ id: '1', title: '1', aggConfig: {} }],
      rows: [],
    });
    expect(data).to.not.be.an('undefined');
    expect(data.rows).to.equal([]);
  });
});

describe.skip('renderbot#buildChartData', function() {
  describe('for hierarchical vis', function() {
    it('defers to hierarchical aggResponse converter', function() {
      const football = {};
      const stub = sinon.stub(aggResponseIndex, 'hierarchical').returns(football);
      expect(vislibSeriesResponseHandler(football)).to.be(football);
      expect(stub).to.have.property('callCount', 1);
      expect(stub.firstCall.args[1]).to.be(football);
    });
  });

  describe('for point plot', function() {
    it('calls tabify to simplify the data into a table', function() {
      const football = { tables: [], hits: { total: 1 } };
      const stub = sinon.stub(aggResponseIndex, 'tabify').returns(football);
      expect(vislibSeriesResponseHandler(football)).to.eql({ rows: [], hits: 1 });
      expect(stub).to.have.property('callCount', 1);
      expect(stub.firstCall.args[1]).to.be(football);
    });

    it('returns a single chart if the tabify response contains only a single table', function() {
      const chart = { hits: 1, rows: [], columns: [] };
      const esResp = { hits: { total: 1 } };
      const tabbed = { tables: [{}] };

      sinon.stub(aggResponseIndex, 'tabify').returns(tabbed);
      expect(vislibSeriesResponseHandler(esResp)).to.eql(chart);
    });

    it('converts table groups into rows/columns wrappers for charts', function() {
      const converter = sinon.stub().returns('chart');
      const esResp = { hits: { total: 1 } };
      const tables = [{}, {}, {}, {}];

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

      const chartData = vislibSeriesResponseHandler(esResp);

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
