define(function (require) {
  var keys = {};
  return {
    get: function (path, def) {
      return keys[path] == null ? def : keys[path];
    },
    set: function (path, val) {
      keys[path] = val;
      return val;
    },
    on: function (eventName, callback) {
      return;
    },
    off: function (eventName) {
      return;
    }
  }
})