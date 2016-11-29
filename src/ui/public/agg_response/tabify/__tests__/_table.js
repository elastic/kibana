import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import AggResponseTabifyTableProvider from 'ui/agg_response/tabify/_table';
describe('Table class', function () {

  let Table;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, $injector) {
    Table = Private(AggResponseTabifyTableProvider);
  }));

  it('exposes rows array, but not the columns', function () {
    let table = new Table();
    expect(table.rows).to.be.an('array');
    expect(table.columns == null).to.be.ok();
  });

  describe('#aggConfig', function () {
    it('accepts a column from the table and returns its agg config', function () {
      let table = new Table();
      let football = {};
      let column = {
        aggConfig: football
      };

      expect(table.aggConfig(column)).to.be(football);
    });

    it('throws a TypeError if the column is malformed', function () {
      expect(function () {
        let notAColumn = {};
        (new Table()).aggConfig(notAColumn);
      }).to.throwException(TypeError);
    });
  });

  describe('#title', function () {
    it('returns nothing if the table is not part of a table group', function () {
      let table = new Table();
      expect(table.title()).to.be('');
    });

    it('returns the title of the TableGroup if the table is part of one', function () {
      let table = new Table();
      table.$parent = {
        title: 'TableGroup Title',
        tables: [table]
      };

      expect(table.title()).to.be('TableGroup Title');
    });
  });

  describe('#field', function () {
    it('calls the columns aggConfig#getField() method', function () {
      let table = new Table();
      let football = {};
      let column = {
        aggConfig: {
          getField: _.constant(football)
        }
      };

      expect(table.field(column)).to.be(football);
    });
  });

  describe('#fieldFormatter', function () {
    it('calls the columns aggConfig#fieldFormatter() method', function () {
      let table = new Table();
      let football = {};
      let column = {
        aggConfig: {
          fieldFormatter: _.constant(football)
        }
      };

      expect(table.fieldFormatter(column)).to.be(football);
    });
  });
});
