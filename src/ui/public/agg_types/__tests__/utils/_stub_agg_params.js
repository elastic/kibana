import _ from 'lodash';
import sinon from 'sinon';
import { BaseParamType } from '../../param_types/base';
import { FieldParamType } from '../../param_types/field';
import { OptionedParamType } from '../../param_types/optioned';
import { createLegacyClass } from '../../../utils/legacy_class';

function ParamClassStub(parent, body) {
  const stub = sinon.spy(body || function () {
    stub.Super && stub.Super.call(this);
  });
  if (parent) createLegacyClass(stub).inherits(parent);
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
// eslint-disable-next-line @elastic/kibana-custom/no-default-export
export default function stubParamClasses(Private) {
  const BaseAggParam = Private.stub(
    BaseParamType,
    new ParamClassStub(null, function (config) {
      _.assign(this, config);
    })
  );

  Private.stub(
    FieldParamType,
    new ParamClassStub(BaseAggParam)
  );

  Private.stub(
    OptionedParamType,
    new ParamClassStub(BaseAggParam)
  );
}
