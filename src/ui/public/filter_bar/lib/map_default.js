import angular from 'angular';
import _ from 'lodash';
export default function mapDefaultProvider(Promise) {

  var metaProperty = /(^\$|meta)/;

  return function (filter) {
    var key = _.find(_.keys(filter), function (key) {
      return !key.match(metaProperty);
    });

    if (key) {
      var value = angular.toJson(filter[key]);
      return Promise.resolve({ key: key, value: value });
    }
    return Promise.reject(filter);
  };
};
