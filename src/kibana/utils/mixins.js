define(function (require) {
  var _ = require('lodash');

  _.mixin({
    // return an object, which is an indexed version of the list
    // using the property as the key
    indexBy: function (list, prop) {
      return _.transform(list, function (indexed, obj) {
        var key = obj && obj[prop];
        if (obj) {
          indexed[key] = obj;
        }
      }, {});
    }
  });

  return _;
});