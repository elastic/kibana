import _ from 'lodash';
import fixtures from 'fixtures/fake_hierarchical_data';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { AggResponseTabifyProvider } from 'ui/agg_response/tabify/tabify';
import { VisProvider } from 'ui/vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

describe('tabifyAggResponse Integration', function () {
  let Vis;
  let indexPattern;
  let tabifyAggResponse;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    tabifyAggResponse = Private(AggResponseTabifyProvider);
    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
  }));

  function normalizeIds(vis) {
    vis.aggs.forEach(function (agg, i) {
      agg.id = 'agg_' + (i + 1);
    });
  }

  it('transforms a simple response properly', function () {
    const vis = new Vis(indexPattern, {
      type: 'histogram',
      aggs: []
    });
    normalizeIds(vis);

    const resp = tabifyAggResponse(vis, fixtures.metricOnly, { canSplit: false });

    expect(resp).to.not.have.property('tables');
    expect(resp).to.have.property('rows').and.property('columns');
    expect(resp.rows).to.have.length(1);
    expect(resp.columns).to.have.length(1);

    expect(resp.rows[0]).to.eql([1000]);
    expect(resp.columns[0]).to.have.property('aggConfig', vis.aggs[0]);
  });

  describe('transforms a complex response', function () {
    this.slow(1000);

    let vis;
    let avg;
    let ext;
    let src;
    let os;
    let esResp;

    beforeEach(function () {
      vis = new Vis(indexPattern, {
        type: 'pie',
        aggs: [
          { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
          { type: 'terms', schema: 'split', params: { field: 'extension' } },
          { type: 'terms', schema: 'segment', params: { field: 'geo.src' } },
          { type: 'terms', schema: 'segment', params: { field: 'machine.os' } }
        ]
      });
      normalizeIds(vis);

      avg = vis.aggs[0];
      ext = vis.aggs[1];
      src = vis.aggs[2];
      os = vis.aggs[3];

      esResp = _.cloneDeep(fixtures.threeTermBuckets);
      // remove the buckets for css              in MX
      esResp.aggregations.agg_2.buckets[1].agg_3.buckets[0].agg_4.buckets = [];
    });

    // check that the root table group is formed properly, then pass
    // each table to expectExtensionSplit, along with the expectInnerTables()
    // function.
    function expectRootGroup(rootTableGroup, expectInnerTables) {
      expect(rootTableGroup).to.have.property('tables');

      const tables = rootTableGroup.tables;
      expect(tables).to.be.an('array').and.have.length(3);
      expectExtensionSplit(tables[0], 'png', expectInnerTables);
      expectExtensionSplit(tables[1], 'css', expectInnerTables);
      expectExtensionSplit(tables[2], 'html', expectInnerTables);
    }

    // check that the tableGroup for the extension agg was formed properly
    // then call expectTable() on each table inside. it should validate that
    // each table is formed properly
    function expectExtensionSplit(tableGroup, key, expectTable) {
      expect(tableGroup).to.have.property('tables');
      expect(tableGroup).to.have.property('aggConfig', ext);
      expect(tableGroup).to.have.property('key', key);
      expect(tableGroup.tables).to.be.an('array').and.have.length(1);

      tableGroup.tables.forEach(function (table) {
        expectTable(table, key);
      });
    }

    // check that the columns of a table are formed properly
    function expectColumns(table, aggs) {
      expect(table.columns).to.be.an('array').and.have.length(aggs.length);
      aggs.forEach(function (agg, i) {
        expect(table.columns[i]).to.have.property('aggConfig', agg);
      });
    }

    // check that a row has expected values
    function expectRow(row, asserts) {
      expect(row).to.be.an('array');
      expect(row).to.have.length(asserts.length);
      asserts.forEach(function (assert, i) {
        assert(row[i]);
      });
    }

    // check for two character country code
    function expectCountry(val) {
      expect(val).to.be.a('string');
      expect(val).to.have.length(2);
    }

    // check for an empty cell
    function expectEmpty(val) {
      expect(val)
      .to.be('');
    }

    // check for an OS term
    function expectOS(val) {
      expect(val)
      .to.match(/^(win|mac|linux)$/);
    }

    // check for something like an average bytes result
    function expectAvgBytes(val) {
      expect(val).to.be.a('number');
      expect(val === 0 || val > 1000).to.be.ok();
    }

    // create an assert that checks for an expected value
    function expectVal(expected) {
      return function (val) {
        expect(val).to.be(expected);
      };
    }

    it('for non-hierarchical vis', function () {
      // the default for a non-hierarchical vis is to display
      // only complete rows, and only put the metrics at the end.

      vis.isHierarchical = _.constant(false);
      const tabbed = tabifyAggResponse(vis, esResp);

      expectRootGroup(tabbed, function expectTable(table, splitKey) {
        expectColumns(table, [src, os, avg]);

        table.rows.forEach(function (row) {
          if (splitKey === 'css' && row[0] === 'MX') {
            throw new Error('expected the MX row in the css table to be removed');
          } else {
            expectRow(row, [
              expectCountry,
              expectOS,
              expectAvgBytes
            ]);
          }
        });
      });
    });

    it('for hierarchical vis, with partial rows', function () {
      // since we have partialRows we expect that one row will have some empty
      // values, and since the vis is hierarchical and we are NOT using
      // minimalColumns we should expect the partial row to be completely after
      // the existing bucket and it's metric

      vis.isHierarchical = _.constant(true);
      const tabbed = tabifyAggResponse(vis, esResp, {
        partialRows: true
      });

      expectRootGroup(tabbed, function expectTable(table, splitKey) {
        expectColumns(table, [src, avg, os, avg]);

        table.rows.forEach(function (row) {
          if (splitKey === 'css' && row[0] === 'MX') {
            expectRow(row, [
              expectCountry,
              expectAvgBytes,
              expectEmpty,
              expectEmpty
            ]);
          } else {
            expectRow(row, [
              expectCountry,
              expectAvgBytes,
              expectOS,
              expectAvgBytes
            ]);
          }
        });
      });
    });

    it('for hierarchical vis, with partial rows, and minimal columns', function () {
      // since we have partialRows we expect that one row has some empty
      // values, and since the vis is hierarchical and we are displaying using
      // minimalColumns, we should expect the partial row to have a metric at
      // the end

      vis.isHierarchical = _.constant(true);
      const tabbed = tabifyAggResponse(vis, esResp, {
        partialRows: true,
        minimalColumns: true
      });

      expectRootGroup(tabbed, function expectTable(table, splitKey) {
        expectColumns(table, [src, os, avg]);

        table.rows.forEach(function (row) {
          if (splitKey === 'css' && row[0] === 'MX') {
            expectRow(row, [
              expectCountry,
              expectEmpty,
              expectVal(9299)
            ]);
          } else {
            expectRow(row, [
              expectCountry,
              expectOS,
              expectAvgBytes
            ]);
          }
        });
      });
    });

    it('for non-hierarchical vis, minimal columns set to false', function () {
      // the reason for this test is mainly to check that setting
      // minimalColumns = false on a non-hierarchical vis doesn't
      // create metric columns after each bucket

      vis.isHierarchical = _.constant(false);
      const tabbed = tabifyAggResponse(vis, esResp, {
        minimalColumns: false
      });

      expectRootGroup(tabbed, function expectTable(table) {
        expectColumns(table, [src, os, avg]);

        table.rows.forEach(function (row) {
          expectRow(row, [
            expectCountry,
            expectOS,
            expectAvgBytes
          ]);
        });
      });
    });
  });
});
