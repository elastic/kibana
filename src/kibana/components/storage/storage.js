define(function (require) {
  var modules = require('modules');
  var store = localStorage;

  modules.get('kibana/storage')
  .service('storage', function () {
    function Storage() {
      var storage = this;

      storage.get = function (key) {
        try {
          return JSON.parse(store.getItem(key));
        } catch (e) {
          return null;
        }
      };

      storage.set = function (key, value) {
        try {
          return store.setItem(key, JSON.stringify(value));
        } catch (e) {
          return false;
        }
      };

      storage.remove = function (key) {
        return store.removeItem(key);
      };

      storage.clear = function () {
        return store.clear();
      };
    }

    return new Storage();
  });
});