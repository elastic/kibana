import _ from 'lodash';
export default function BaseAggParamFactory() {

  function BaseAggParam(config) {
    _.assign(this, config);
  }

  return BaseAggParam;
}
