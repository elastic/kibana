import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import AggResponsePointSeriesGetPointProvider from 'ui/agg_response/point_series/_get_point';

describe('getPoint', function () {

  let getPoint;

  var truthFormatted = { fieldFormatter: _.constant(_.constant(true)) };
  var identFormatted = { fieldFormatter: _.constant(_.identity) };

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    getPoint = Private(AggResponsePointSeriesGetPointProvider);
  }));

  describe('Without series aspect', function () {
    let seriesAspect;
    let xAspect;
    let yAspect;
    let yScale;

    beforeEach(function () {
      seriesAspect = null;
      xAspect = { i: 0 };
      yAspect = { i: 1 };
      yScale = 5;
    });

    it('properly unwraps and scales values', function () {
      var row = [ { value: 1 }, { value: 2 }, { value: 3 } ];
      var zAspect = { i: 2 };
      var point = getPoint(xAspect, seriesAspect, yScale, row, yAspect, zAspect);

      expect(point)
        .to.have.property('x', 1)
        .and.have.property('y', 10)
        .and.have.property('z', 3)
        .and.have.property('aggConfigResult', row[1])
        .and.not.have.property('series');
    });

    it('ignores points with a y value of NaN', function () {
      var row = [ { value: 1 }, { value: 'NaN' }];
      var point = getPoint(xAspect, seriesAspect, yScale, row, yAspect);
      expect(point).to.be(void 0);
    });
  });

  describe('With series aspect', function () {
    let row;
    let xAspect;
    let yAspect;
    let yScale;

    beforeEach(function () {
      row = [ { value: 1 }, { value: 2 }, { value: 3 }];
      xAspect = { i: 0 };
      yAspect = { i: 2 };
      yScale = null;
    });

    it('properly unwraps and scales values', function () {
      var seriesAspect = { i: 1, agg: identFormatted };
      var point = getPoint(xAspect, seriesAspect, yScale, row, yAspect);

      expect(point)
        .to.have.property('x', 1)
        .and.have.property('series', 2)
        .and.have.property('y', 3)
        .and.have.property('aggConfigResult', row[2]);
    });

    it('properly formats series values', function () {
      var seriesAspect = { i: 1, agg: truthFormatted };
      var point = getPoint(xAspect, seriesAspect, yScale, row, yAspect);

      expect(point)
        .to.have.property('x', 1)
        .and.have.property('series', true)
        .and.have.property('y', 3)
        .and.have.property('aggConfigResult', row[2]);
    });

    it ('adds the aggConfig to the points', function () {
      var seriesAspect = { i: 1, agg:  truthFormatted};
      var point = getPoint(xAspect, seriesAspect, yScale, row, yAspect);

      expect(point).to.have.property('aggConfig', truthFormatted);
    });
  });
});
