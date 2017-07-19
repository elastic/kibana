import _ from 'lodash';

export function AggTypesParamTypesBaseProvider() {

  function BaseAggParam(config) {
    _.assign(this, config);
  }

  return BaseAggParam;
}
