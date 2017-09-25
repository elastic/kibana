import expect from 'expect.js';
import ngMock from 'ng_mock';
import { BaseParamTypeProvider } from '../../param_types/base';
import { OptionedParamTypeProvider } from '../../param_types/optioned';

describe('Optioned', function () {

  let BaseParamType;
  let OptionedParamType;

  beforeEach(ngMock.module('kibana'));
  // fetch out deps
  beforeEach(ngMock.inject(function (Private) {
    BaseParamType = Private(BaseParamTypeProvider);
    OptionedParamType = Private(OptionedParamTypeProvider);
  }));

  describe('constructor', function () {
    it('it is an instance of BaseParamType', function () {
      const aggParam = new OptionedParamType({
        name: 'some_param',
        type: 'optioned'
      });

      expect(aggParam).to.be.a(BaseParamType);
    });
  });
});
