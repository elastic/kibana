import _ from 'lodash';
import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { TabbedAggResponseWriterProvider } from 'ui/agg_response/tabify/_response_writer';
import { AggResponseTabifyTableGroupProvider } from 'ui/agg_response/tabify/_table_group';
import { AggResponseBucketsProvider } from 'ui/agg_response/tabify/_buckets';
import { AggResponseGetColumnsProvider } from 'ui/agg_response/tabify/_get_columns';
import { VisProvider } from 'ui/vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

describe('ResponseWriter class', function () {
  let Vis;
  let Buckets;
  let Private;
  let TableGroup;
  let getColumns;
  let indexPattern;
  let ResponseWriter;

  function defineSetup(stubGetColumns) {
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function ($injector) {
      Private = $injector.get('Private');

      if (stubGetColumns) {
        getColumns = sinon.stub();
        Private.stub(AggResponseGetColumnsProvider, getColumns);
      }

      ResponseWriter = Private(TabbedAggResponseWriterProvider);
      TableGroup = Private(AggResponseTabifyTableGroupProvider);
      Buckets = Private(AggResponseBucketsProvider);
      Vis = Private(VisProvider);
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    }));
  }

  describe('Constructor', function () {
    defineSetup(true);

    it('gets the columns for the vis', function () {
      const vis = new Vis(indexPattern, { type: 'histogram', aggs: [] });
      new ResponseWriter(vis);

      expect(getColumns).to.have.property('callCount', 1);
      expect(getColumns.firstCall.args[0]).to.be(vis);
    });

    it('collects the aggConfigs from each column in aggStack', function () {
      const aggs = [
        { type: 'date_histogram', schema: 'segment', params: { field: '@timestamp' } },
        { type: 'terms', schema: 'segment', params: { field: 'extension' } },
        { type: 'avg', schema: 'metric', params: { field: 'bytes' } }
      ];

      getColumns.returns(aggs.map(function (agg) {
        return { aggConfig: agg };
      }));

      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: aggs
      });

      const writer = new ResponseWriter(vis);
      expect(writer.aggStack).to.be.an('array');
      expect(writer.aggStack).to.have.length(aggs.length);
      writer.aggStack.forEach(function (agg, i) {
        expect(agg).to.be(aggs[i]);
      });
    });

    it('sets canSplit=true by default', function () {
      const vis = new Vis(indexPattern, { type: 'histogram', aggs: [] });
      const writer = new ResponseWriter(vis);
      expect(writer).to.have.property('canSplit', true);
    });

    it('sets canSplit=false when config says to', function () {
      const vis = new Vis(indexPattern, { type: 'histogram', aggs: [] });
      const writer = new ResponseWriter(vis, { canSplit: false });
      expect(writer).to.have.property('canSplit', false);
    });

    describe('sets partialRows', function () {
      it('to the value of the config if set', function () {
        const vis = new Vis(indexPattern, { type: 'histogram', aggs: [] });
        const partial = Boolean(Math.round(Math.random()));

        const writer = new ResponseWriter(vis, { partialRows: partial });
        expect(writer).to.have.property('partialRows', partial);
      });

      it('to the value of vis.isHierarchical if no config', function () {
        const vis = new Vis(indexPattern, { type: 'histogram', aggs: [] });
        const hierarchical = Boolean(Math.round(Math.random()));
        sinon.stub(vis, 'isHierarchical').returns(hierarchical);

        const writer = new ResponseWriter(vis, {});
        expect(writer).to.have.property('partialRows', hierarchical);
      });
    });

    it('starts off with a root TableGroup', function () {
      const vis = new Vis(indexPattern, { type: 'histogram', aggs: [] });

      const writer = new ResponseWriter(vis);
      expect(writer.root).to.be.a(TableGroup);
      expect(writer.splitStack).to.be.an('array');
      expect(writer.splitStack).to.have.length(1);
      expect(writer.splitStack[0]).to.be(writer.root);
    });
  });

  describe('', function () {
    defineSetup();

    describe('#response()', function () {
      it('returns the root TableGroup if splitting', function () {
        const vis = new Vis(indexPattern, { type: 'histogram', aggs: [] });
        const writer = new ResponseWriter(vis);
        expect(writer.response()).to.be(writer.root);
      });

      it('returns the first table if not splitting', function () {
        const vis = new Vis(indexPattern, { type: 'histogram', aggs: [] });
        const writer = new ResponseWriter(vis, { canSplit: false });
        const table = writer._table();
        expect(writer.response()).to.be(table);
      });

      it('adds columns to all of the tables', function () {
        const vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            { type: 'terms', params: { field: '_type' }, schema: 'split' },
            { type: 'count', schema: 'metric' }
          ]
        });
        const buckets = new Buckets({ buckets: [ { key: 'nginx' }, { key: 'apache' } ] });
        const writer = new ResponseWriter(vis);
        const tables = [];

        writer.split(vis.aggs[0], buckets, function () {
          writer.cell(vis.aggs[1], 100, function () {
            tables.push(writer.row());
          });
        });

        tables.forEach(function (table) {
          expect(table.columns == null).to.be(true);
        });

        const resp = writer.response();
        expect(resp).to.be.a(TableGroup);
        expect(resp.tables).to.have.length(2);

        const nginx = resp.tables.shift();
        expect(nginx).to.have.property('aggConfig', vis.aggs[0]);
        expect(nginx).to.have.property('key', 'nginx');
        expect(nginx.tables).to.have.length(1);
        nginx.tables.forEach(function (table) {
          expect(_.contains(tables, table)).to.be(true);
        });

        const apache = resp.tables.shift();
        expect(apache).to.have.property('aggConfig', vis.aggs[0]);
        expect(apache).to.have.property('key', 'apache');
        expect(apache.tables).to.have.length(1);
        apache.tables.forEach(function (table) {
          expect(_.contains(tables, table)).to.be(true);
        });

        tables.forEach(function (table) {
          expect(table.columns).to.be.an('array');
          expect(table.columns).to.have.length(1);
          expect(table.columns[0].aggConfig.type.name).to.be('count');
        });
      });
    });

    describe('#split()', function () {
      it('with break if the user has specified that splitting is to be disabled', function () {
        const vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            { type: 'terms', schema: 'split', params: { field: '_type' } },
            { type: 'count', schema: 'metric' }
          ]
        });
        const agg = vis.aggs.bySchemaName.split[0];
        const buckets = new Buckets({ buckets: [ { key: 'apache' } ] });
        const writer = new ResponseWriter(vis, { canSplit: false });

        expect(function () {
          writer.split(agg, buckets, _.noop);
        }).to.throwException(/splitting is disabled/);
      });

      it('forks the acrStack and rewrites the parents', function () {
        const vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            { type: 'terms', params: { field: 'extension' }, schema: 'segment' },
            { type: 'terms', params: { field: '_type' }, schema: 'split' },
            { type: 'terms', params: { field: 'machine.os' }, schema: 'segment' },
            { type: 'count', schema: 'metric' }
          ]
        });

        const writer = new ResponseWriter(vis, { asAggConfigResults: true });
        const extensions = new Buckets({ buckets: [ { key: 'jpg' }, { key: 'png' } ] });
        const types = new Buckets({ buckets: [ { key: 'nginx' }, { key: 'apache' } ] });
        const os = new Buckets({ buckets: [ { key: 'window' }, { key: 'osx' } ] });

        extensions.forEach(function (b, extension) {
          writer.cell(vis.aggs[0], extension, function () {
            writer.split(vis.aggs[1], types, function () {
              os.forEach(function (b, os) {
                writer.cell(vis.aggs[2], os, function () {
                  writer.cell(vis.aggs[3], 200, function () {
                    writer.row();
                  });
                });
              });
            });
          });
        });

        const tables = _.flattenDeep(_.pluck(writer.response().tables, 'tables'));
        expect(tables.length).to.be(types.length);

        // collect the far left acr from each table
        const leftAcrs = _.pluck(tables, 'rows[0][0]');

        leftAcrs.forEach(function (acr, i, acrs) {
          expect(acr.aggConfig).to.be(vis.aggs[0]);
          expect(acr.$parent.aggConfig).to.be(vis.aggs[1]);
          expect(acr.$parent.$parent).to.be(void 0);

          // for all but the last acr, compare to the next
          if (i + 1 >= acrs.length) return;
          const acr2 = leftAcrs[i + 1];

          expect(acr.key).to.be(acr2.key);
          expect(acr.value).to.be(acr2.value);
          expect(acr.aggConfig).to.be(acr2.aggConfig);
          expect(acr.$parent).to.not.be(acr2.$parent);
        });
      });


    });

    describe('#cell()', function () {
      it('logs a cell in the ResponseWriters row buffer, calls the block arg, then removes the value from the buffer',
      function () {
        const vis = new Vis(indexPattern, { type: 'histogram', aggs: [] });
        const writer = new ResponseWriter(vis);

        expect(writer.rowBuffer).to.have.length(0);
        writer.cell({}, 500, function () {
          expect(writer.rowBuffer).to.have.length(1);
          expect(writer.rowBuffer[0]).to.be(500);
        });
        expect(writer.rowBuffer).to.have.length(0);
      });
    });

    describe('#row()', function () {
      it('writes the ResponseWriters internal rowBuffer into a table', function () {
        const vis = new Vis(indexPattern, { type: 'histogram', aggs: [] });
        const writer = new ResponseWriter(vis);

        const table = writer._table();
        writer.cell({}, 1, function () {
          writer.cell({}, 2, function () {
            writer.cell({}, 3, function () {
              writer.row();
            });
          });
        });

        expect(table.rows).to.have.length(1);
        expect(table.rows[0]).to.eql([1, 2, 3]);
      });

      it('always writes to the table group at the top of the split stack', function () {
        const vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            { type: 'terms', schema: 'split', params: { field: '_type' } },
            { type: 'terms', schema: 'split', params: { field: 'extension' } },
            { type: 'terms', schema: 'split', params: { field: 'machine.os' } },
            { type: 'count', schema: 'metric' }
          ]
        });
        const splits = vis.aggs.bySchemaName.split;

        const type = splits[0];
        const typeBuckets = new Buckets({ buckets: [ { key: 'nginx' }, { key: 'apache' } ] });

        const ext = splits[1];
        const extBuckets = new Buckets({ buckets: [ { key: 'jpg' }, { key: 'png' } ] });

        const os = splits[2];
        const osBuckets = new Buckets({ buckets: [ { key: 'windows' }, { key: 'mac' } ] });

        const count = vis.aggs[3];

        const writer = new ResponseWriter(vis);
        writer.split(type, typeBuckets, function () {
          writer.split(ext, extBuckets, function () {
            writer.split(os, osBuckets, function (bucket, key) {
              writer.cell(count, key === 'windows' ? 1 : 2, function () {
                writer.row();
              });
            });
          });
        });

        const resp = writer.response();
        let sum = 0;
        let tables = 0;
        (function recurse(t) {
          if (t.tables) {
            // table group
            t.tables.forEach(function (tt) {
              recurse(tt);
            });
          } else {
            tables += 1;
            // table
            t.rows.forEach(function (row) {
              row.forEach(function (cell) {
                sum += cell;
              });
            });
          }
        }(resp));

        expect(tables).to.be(8);
        expect(sum).to.be(12);
      });

      it('writes partial rows for hierarchical vis', function () {
        const vis = new Vis(indexPattern, {
          type: 'pie',
          aggs: [
            { type: 'terms', schema: 'segment', params: { field: '_type' } },
            { type: 'count', schema: 'metric' }
          ]
        });

        const writer = new ResponseWriter(vis);
        const table = writer._table();
        writer.cell(vis.aggs[0], 'apache', function () {
          writer.row();
        });

        expect(table.rows).to.have.length(1);
        expect(table.rows[0]).to.eql(['apache', '']);
      });

      it('skips partial rows for non-hierarchical vis', function () {
        const vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            { type: 'terms', schema: 'segment', params: { field: '_type' } },
            { type: 'count', schema: 'metric' }
          ]
        });

        const writer = new ResponseWriter(vis);
        const table = writer._table();
        writer.cell(vis.aggs[0], 'apache', function () {
          writer.row();
        });

        expect(table.rows).to.have.length(0);
      });
    });
  });
});
