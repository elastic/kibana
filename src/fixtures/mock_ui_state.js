define(function (require) {
  let _ = require('lodash');
  let keys = {};
  return {
    get: function (path, def) {
      return keys[path] == null ? def : keys[path];
    },
    set: function (path, val) {
      keys[path] = val;
      return val;
    },
    on: _.noop,
    off: _.noop
  }
})