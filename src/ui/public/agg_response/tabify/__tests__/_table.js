import _ from 'lodash';
import expect from 'expect.js';
import { TabifyTable } from '../_table';

describe('TabifyTable class', function () {
  it('exposes rows array, but not the columns', function () {
    const table = new TabifyTable();
    expect(table.rows).to.be.an('array');
    expect(table.columns == null).to.be.ok();
  });

  describe('#aggConfig', function () {
    it('accepts a column from the table and returns its agg config', function () {
      const table = new TabifyTable();
      const football = {};
      const column = {
        aggConfig: football
      };

      expect(table.aggConfig(column)).to.be(football);
    });

    it('throws a TypeError if the column is malformed', function () {
      expect(function () {
        const notAColumn = {};
        (new TabifyTable()).aggConfig(notAColumn);
      }).to.throwException(TypeError);
    });
  });

  describe('#title', function () {
    it('returns nothing if the table is not part of a table group', function () {
      const table = new TabifyTable();
      expect(table.title()).to.be('');
    });

    it('returns the title of the TabifyTableGroup if the table is part of one', function () {
      const table = new TabifyTable();
      table.$parent = {
        title: 'TabifyTableGroup Title',
        tables: [table]
      };

      expect(table.title()).to.be('TabifyTableGroup Title');
    });
  });

  describe('#field', function () {
    it('calls the columns aggConfig#getField() method', function () {
      const table = new TabifyTable();
      const football = {};
      const column = {
        aggConfig: {
          getField: _.constant(football)
        }
      };

      expect(table.field(column)).to.be(football);
    });
  });

  describe('#fieldFormatter', function () {
    it('calls the columns aggConfig#fieldFormatter() method', function () {
      const table = new TabifyTable();
      const football = {};
      const column = {
        aggConfig: {
          fieldFormatter: _.constant(football)
        }
      };

      expect(table.fieldFormatter(column)).to.be(football);
    });
  });
});
