describe('Field', function () {
  let _ = require('lodash');
  let expect = require('expect.js');
  let ngMock = require('ngMock');

  let BaseAggParam;
  let FieldAggParam;

  beforeEach(ngMock.module('kibana'));
  // fetch out deps
  beforeEach(ngMock.inject(function (Private) {
    BaseAggParam = Private(require('ui/agg_types/param_types/base'));
    FieldAggParam = Private(require('ui/agg_types/param_types/field'));
  }));

  describe('constructor', function () {
    it('it is an instance of BaseAggParam', function () {
      let aggParam = new FieldAggParam({
        name: 'field'
      });

      expect(aggParam).to.be.a(BaseAggParam);
    });
  });
});
