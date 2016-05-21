import _ from 'lodash';
import expect from 'expect.js';
import base from 'plugins/tagcloud/vis/components/layout/layout';

describe('Layout: base tests', function () {
  var data = [{}, {}, {}];
  var size = [300, 300];

  describe('rows', function () {
    let rows;
    let rowsData;

    beforeEach(function () {
      rows = base().type('rows').size(size);
      rowsData = rows(data);
    });

    it('should be a function', function () {
      expect(_.isFunction(rows)).to.be(true);
    });

    it('should create rows', function () {
      var width = size[0];
      var height = size[1] / rowsData.length;

      rowsData.forEach(function (chart) {
        expect(_.isEqual(chart.dx, 0)).to.be(true);
        expect(_.isEqual(chart.dy % height, 0)).to.be(true);
        expect(_.isEqual(chart.width, width)).to.be(true);
        expect(_.isEqual(chart.height, height)).to.be(true);
      });
    });
  });

  describe('columns', function () {
    let cols;
    let colsData;

    beforeEach(function () {
      cols = base().type('columns').size(size);
      colsData = cols(data);
    });

    it('should be a function', function () {
      expect(_.isFunction(cols)).to.be(true);
    });

    it('should create columns', function () {
      var width = size[0] / colsData.length;
      var height = size[1];

      colsData.forEach(function (chart) {
        expect(_.isEqual(chart.dx % width, 0)).to.be(true);
        expect(_.isEqual(chart.dy, 0)).to.be(true);
        expect(_.isEqual(chart.width, width)).to.be(true);
        expect(_.isEqual(chart.height, height)).to.be(true);
      });
    });
  });

  describe('grid', function () {
    let grid;
    let gridData;

    beforeEach(function () {
      grid = base().type('grid').size(size);
      gridData = grid(data);
    });

    it('should be a function', function () {
      expect(_.isFunction(grid)).to.be(true);
    });

    it('should create grids', function () {
      var width = size[0] / Math.round(Math.sqrt(data.length));
      var height = size[1] / Math.ceil(Math.sqrt(data.length));

      gridData.forEach(function (chart) {
        expect(_.isEqual(chart.dx % width, 0)).to.be(true);
        expect(_.isEqual(chart.dy % height, 0)).to.be(true);
        expect(_.isEqual(chart.width, width)).to.be(true);
        expect(_.isEqual(chart.height, height)).to.be(true);
      });
    });
  });
});
