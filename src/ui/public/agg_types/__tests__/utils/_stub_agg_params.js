import _ from 'lodash';
import sinon from 'sinon';
import { AggTypesParamTypesBaseProvider } from 'ui/agg_types/param_types/base';
import { AggTypesParamTypesFieldProvider } from 'ui/agg_types/param_types/field';
import { AggTypesParamTypesOptionedProvider } from 'ui/agg_types/param_types/optioned';

function ParamClassStub(parent, body) {
  const stub = sinon.spy(body || function () {
    stub.Super && stub.Super.call(this);
  });
  if (parent) _.class(stub).inherits(parent);
  return stub;
}

/**
 * stub all of the param classes, but ensure that they still inherit properly.
 * This method should be passed directly to ngMock.inject();
 *
 * ```js
 * let stubParamClasses = require('./utils/_stub_agg_params');
 * describe('something', function () {
 *   beforeEach(ngMock.inject(stubParamClasses));
 * })
 * ```
 *
 * @param  {PrivateLoader} Private - The private module loader, inject by passing this function to ngMock.inject()
 * @return {undefined}
 */
module.exports = function stubParamClasses(Private) {
  const BaseAggParam = Private.stub(
    AggTypesParamTypesBaseProvider,
    new ParamClassStub(null, function (config) {
      _.assign(this, config);
    })
  );

  Private.stub(
    AggTypesParamTypesFieldProvider,
    new ParamClassStub(BaseAggParam)
  );

  Private.stub(
    AggTypesParamTypesOptionedProvider,
    new ParamClassStub(BaseAggParam)
  );
};
