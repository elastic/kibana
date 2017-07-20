import expect from 'expect.js';
import ngMock from 'ng_mock';
import { AggResponseGetColumnsProvider } from 'ui/agg_response/tabify/_get_columns';
import { VisProvider } from 'ui/vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
describe('get columns', function () {
  let getColumns;
  let Vis;
  let indexPattern;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    getColumns = Private(AggResponseGetColumnsProvider);
    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
  }));

  it('should inject a count metric if no aggs exist', function () {
    const vis = new Vis(indexPattern, {
      type: 'pie'
    });
    while (vis.aggs.length) vis.aggs.pop();
    const columns = getColumns(vis);

    expect(columns).to.have.length(1);
    expect(columns[0]).to.have.property('aggConfig');
    expect(columns[0].aggConfig.type).to.have.property('name', 'count');
  });

  it('should inject a count metric if only buckets exist', function () {
    const vis = new Vis(indexPattern, {
      type: 'pie',
      aggs: [
        { type: 'date_histogram', schema: 'segment',  params: { field: '@timestamp' } }
      ]
    });

    const columns = getColumns(vis);

    expect(columns).to.have.length(2);
    expect(columns[1]).to.have.property('aggConfig');
    expect(columns[1].aggConfig.type).to.have.property('name', 'count');
  });

  it('should inject the metric after each bucket if the vis is hierarchical', function () {
    const vis = new Vis(indexPattern, {
      type: 'pie',
      aggs: [
        { type: 'date_histogram', schema: 'segment',  params: { field: '@timestamp' } },
        { type: 'date_histogram', schema: 'segment',  params: { field: '@timestamp' } },
        { type: 'date_histogram', schema: 'segment',  params: { field: '@timestamp' } },
        { type: 'date_histogram', schema: 'segment',  params: { field: '@timestamp' } }
      ]
    });

    const columns = getColumns(vis);

    expect(columns).to.have.length(8);
    columns.forEach(function (column, i) {
      expect(column).to.have.property('aggConfig');
      expect(column.aggConfig.type).to.have.property('name', i % 2 ? 'count' : 'date_histogram');
    });
  });

  it('should inject the multiple metrics after each bucket if the vis is hierarchical', function () {
    const vis = new Vis(indexPattern, {
      type: 'pie',
      aggs: [
        { type: 'date_histogram', schema: 'segment',  params: { field: '@timestamp' } },
        { type: 'avg',            schema: 'metric',   params: { field: 'bytes' } },
        { type: 'date_histogram', schema: 'segment',  params: { field: '@timestamp' } },
        { type: 'date_histogram', schema: 'segment',  params: { field: '@timestamp' } },
        { type: 'sum',            schema: 'metric',   params: { field: 'bytes' } },
        { type: 'date_histogram', schema: 'segment',  params: { field: '@timestamp' } }
      ]
    });

    const columns = getColumns(vis);

    function checkColumns(column, i) {
      expect(column).to.have.property('aggConfig');
      switch (i) {
        case 0:
          expect(column.aggConfig.type).to.have.property('name', 'date_histogram');
          break;
        case 1:
          expect(column.aggConfig.type).to.have.property('name', 'avg');
          break;
        case 2:
          expect(column.aggConfig.type).to.have.property('name', 'sum');
          break;
      }
    }

    expect(columns).to.have.length(12);
    for (let i = 0; i < columns.length; i += 3) {
      columns.slice(i, i + 3).forEach(checkColumns);
    }
  });

  it('should put all metrics at the end of the columns if the vis is not hierarchical', function () {
    const vis = new Vis(indexPattern, {
      type: 'histogram',
      aggs: [
        { type: 'date_histogram', schema: 'segment',  params: { field: '@timestamp' } },
        { type: 'avg',            schema: 'metric',   params: { field: 'bytes' } },
        { type: 'date_histogram', schema: 'segment',  params: { field: '@timestamp' } },
        { type: 'date_histogram', schema: 'segment',  params: { field: '@timestamp' } },
        { type: 'sum',            schema: 'metric',   params: { field: 'bytes' } },
        { type: 'date_histogram', schema: 'segment',  params: { field: '@timestamp' } }
      ]
    });

    const columns = getColumns(vis);
    expect(columns).to.have.length(6);

    // sum should be last
    expect(columns.pop().aggConfig.type).to.have.property('name', 'sum');
    // avg should be before that
    expect(columns.pop().aggConfig.type).to.have.property('name', 'avg');
    // the rest are date_histograms
    while (columns.length) {
      expect(columns.pop().aggConfig.type).to.have.property('name', 'date_histogram');
    }
  });
});
