define(function (require) {
  var _ = require('lodash');
  return function (indexPattern, nestedObj) {
    var key; // original key
    var stack = []; // track key stack
    var flatObj = {};
    var fields = indexPattern.fields;

    (function flattenObj(obj) {
      _.keys(obj).forEach(function (key) {
        stack.push(key);
        var flattenKey = stack.join('.');

        if ((fields.byName[flattenKey] || _.isArray(obj[key]) || !_.isObject(obj[key]))) {
          flatObj[flattenKey] = obj[key];
        } else if (_.isObject(obj[key])) {
          flattenObj(obj[key]);
        }

        stack.pop();
      });
    }(nestedObj));

    return flatObj;
  };
});
