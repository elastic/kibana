import _ from 'lodash';

export function BaseParamTypeProvider() {

  function BaseParamType(config) {
    _.assign(this, config);
  }

  return BaseParamType;
}
