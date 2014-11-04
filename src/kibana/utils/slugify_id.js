define(function (require) {
  var _ = require('lodash');
  return function (id) {
    if (id == null) return;

    var trans = {
      '/' : '-slash-',
      '\\?' : '-questionmark-',
      '\\&' : '-ampersand-',
      '=' : '-equal-'
    };
    _.each(trans, function (val, key) {
      var regex = new RegExp(key);
      id = id.replace(regex, val);
    });
    id = id.replace(/[\s]+/g, '_');
    id = id.replace(/[_]+/g, '_');
    return id;
  };
});
