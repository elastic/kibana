define(function (require) {
  var modules = require('modules');

  modules.get('kibana/storage')
  .service('storage', function ($window) {
    function Storage() {
      var storage = this;
      storage.store = $window.localStorage;

      storage.get = function (key) {
        try {
          return JSON.parse(storage.store.getItem(key));
        } catch (e) {
          return null;
        }
      };

      storage.set = function (key, value) {
        try {
          return storage.store.setItem(key, JSON.stringify(value));
        } catch (e) {
          return false;
        }
      };

      storage.remove = function (key) {
        return storage.store.removeItem(key);
      };

      storage.clear = function () {
        return storage.store.clear();
      };
    }

    return new Storage();
  });
});