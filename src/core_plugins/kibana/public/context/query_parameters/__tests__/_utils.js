import _ from 'lodash';


export function createConfigStub(overrides) {
  const config = Object.assign({
    'context:step': '3',
  }, overrides);

  return {
    get: (key) => config[key],
  };
}

export function createStateStub(overrides) {
  return _.merge({
    queryParameters: {
      predecessorCount: 10,
      successorCount: 10,
    },
  }, overrides);
}
