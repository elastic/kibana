define(function (require) {
  var modules = require('modules');
  var _ = require('lodash');

  modules.get('kibana/history')
  .factory('history', function ($window, storage, config) {
    function History(name, length) {
      this.name = name;
      this.maxLength = length || config.get('history:limit');
      this.items = storage.get(this.name) || [];
    }

    History.prototype.add = function (val) {
      if (!val) {
        return this.items;
      }

      var history = _.pull(this.items.slice(0), val);
      history.unshift(val);

      this.items = history.slice(0, this.maxLength);
      storage.set(this.name, this.items);
      return this.items;
    };

    History.prototype.get = function () {
      return this.items;
    };

    return History;
  });
});