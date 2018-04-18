import expect from 'expect.js';
import { BaseParamType } from '../../param_types/base';
import { OptionedParamType } from '../../param_types/optioned';

describe('Optioned', function () {

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
