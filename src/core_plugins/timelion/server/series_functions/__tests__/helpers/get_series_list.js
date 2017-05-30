import _ from 'lodash';

export default function (list, overrides) {
  return _.merge({
    type: 'seriesList',
    list: list
  }, overrides);
}
