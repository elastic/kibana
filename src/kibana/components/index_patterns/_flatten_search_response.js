define(function (require) {
  var _ = require('lodash');
  return function (indexPattern, nestedObj) {
    var keys = []; // track key stack
    var flatObj = {};
    var fields = indexPattern.fields;

    (function flattenObj(obj) {
      _.forOwn(obj, function (val, key) {
        keys.push(key);

        var keyPath = keys.join('.');
        var field = fields.byName[keyPath];

        if (field && field.scripted) {
          val = val[0];
        }

        if (!field && _.isPlainObject(val)) {
          flattenObj(val);
        } else {
          flatObj[keyPath] = val;
        }

        keys.pop();
      });
    }(nestedObj));

    return flatObj;
  };
});
