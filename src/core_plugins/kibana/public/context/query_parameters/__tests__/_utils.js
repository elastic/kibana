import _ from 'lodash';


export function createStateStub(overrides) {
  return _.merge({
    queryParameters: {
      defaultStepSize: 3,
      indexPatternId: 'INDEX_PATTERN_ID',
      predecessorCount: 10,
      successorCount: 10,
    },
  }, overrides);
}
