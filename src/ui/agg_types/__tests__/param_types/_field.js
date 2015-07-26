describe('Field', function () {
  var _ = require('lodash');
  var expect = require('expect.js');
  var ngMock = require('ngMock');

  var BaseAggParam;
  var FieldAggParam;

  beforeEach(ngMock.module('kibana'));
  // fetch out deps
  beforeEach(ngMock.inject(function (Private) {
    BaseAggParam = Private(require('ui/agg_types/param_types/base'));
    FieldAggParam = Private(require('ui/agg_types/param_types/field'));
  }));

  describe('constructor', function () {
    it('it is an instance of BaseAggParam', function () {
      var aggParam = new FieldAggParam({
        name: 'field'
      });

      expect(aggParam).to.be.a(BaseAggParam);
    });
  });
});
