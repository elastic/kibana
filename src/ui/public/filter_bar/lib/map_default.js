import angular from 'angular';
import _ from 'lodash';
export default function mapDefaultProvider(Promise) {

  let metaProperty = /(^\$|meta)/;

  return function (filter) {
    let key = _.find(_.keys(filter), function (key) {
      return !key.match(metaProperty);
    });

    if (key) {
      let value = angular.toJson(filter[key]);
      return Promise.resolve({ key: key, value: value });
    }
    return Promise.reject(filter);
  };
};
