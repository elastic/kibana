define(function (require) {
  return function DelayedUpdaterFactory(Private, $rootScope, Promise, Notifier) {
    var notify = new Notifier();
    var angular = require('angular');
    var vals = Private(require('./_vals'));

    return function DelayedUpdater(doc) {
      var updater = this;
      var queue = [];
      var timer;

      updater.fire = function () {
        clearTimeout(timer);

        // only fire once
        if (updater.fired) return;
        updater.fired = true;

        var method, body;
        if (updater.reindex) {
          method = 'doIndex';
        } else {
          method = 'doUpdate';
        }

        doc[method](vals)
        .then(function (resp) {
          queue.forEach(function (q) { q.resolve(resp); });
        }, function (err) {
          queue.forEach(function (q) { q.reject(err); });
        });
      };

      updater.update = function (key, val, silentAndLocal) {
        var newVal = val;
        var oldVal = vals[key];

        if (angular.equals(newVal, oldVal)) {
          return Promise.resolve();
        }
        else if (newVal == null) {
          // only set if it's true, preserving previous trues
          updater.reindex = true;
          delete vals[key];
        }
        else {
          vals[key] = newVal;
        }

        if (silentAndLocal) return Promise.resolve();

        var defer = Promise.defer();
        queue.push(defer);
        notify.log('config change: ' + key + ': ' + vals[key] + ' -> ' + val);
        $rootScope.$broadcast('change:config.' + key, newVal, oldVal);

        // reset the fire timer
        clearTimeout(timer);
        timer = setTimeout(updater.fire, 200);
        return defer.promise;
      };
    };

  };
});