define(function (require) {
  var modules = require('modules');

  modules.get('kibana/storage')
  .service('storage', function ($window) {
    function Storage() {
      var self = this;
      self.store = $window.localStorage;

      self.get = function (key) {
        try {
          return JSON.parse(self.store.getItem(key));
        } catch (e) {
          return null;
        }
      };

      self.set = function (key, value) {
        try {
          return self.store.setItem(key, JSON.stringify(value));
        } catch (e) {
          return false;
        }
      };

      self.remove = function (key) {
        return self.store.removeItem(key);
      };

      self.clear = function () {
        return self.store.clear();
      };
    }

    return new Storage();
  });
});