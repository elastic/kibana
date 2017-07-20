import angular from 'angular';
import _ from 'lodash';

export function FilterBarLibMapDefaultProvider(Promise) {

  const metaProperty = /(^\$|meta)/;

  return function (filter) {
    const key = _.find(_.keys(filter), function (key) {
      return !key.match(metaProperty);
    });

    if (key) {
      const type = 'custom';
      const value = angular.toJson(filter[key]);
      return Promise.resolve({ type, key, value });
    }

    return Promise.reject(filter);
  };
}
