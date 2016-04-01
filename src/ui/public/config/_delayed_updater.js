define(function (require) {
  return function DelayedUpdaterFactory(Private, $rootScope, Promise, Notifier) {
    let notify = new Notifier();
    let _ = require('lodash');
    let angular = require('angular');

    let vals = Private(require('ui/config/_vals'));

    return function DelayedUpdater(doc) {
      let updater = this;
      let queue = [];
      let log = {};
      let timer;

      updater.fire = function () {
        clearTimeout(timer);

        // only fire once
        if (updater.fired) return;
        updater.fired = true;

        let method;
        let body;
        let updated = [];
        let deleted = [];

        // seperate the log into lists
        Object.keys(log).forEach(function (key) {
          if (log[key] === 'updated') updated.push(key);
          else deleted.push(key);
        });

        if (deleted.length) {
          method = 'doIndex';
          body = _.clone(vals);
        } else {
          method = 'doUpdate';
          body = _.pick(vals, updated);
        }

        doc[method](vals)
        .then(
          function (resp) {
            queue.forEach(function (q) { q.resolve(resp); });
          },
          function (err) {
            queue.forEach(function (q) { q.reject(err); });
          }
        )
        .finally(function () {
          $rootScope.$broadcast('change:config', updated.concat(deleted));
        });
      };

      updater.update = function (key, val, silentAndLocal) {
        let newVal = val;
        let oldVal = vals[key];

        if (angular.equals(newVal, oldVal)) {
          return Promise.resolve();
        }
        else if (newVal == null) {
          delete vals[key];
          log[key] = 'deleted';
        }
        else {
          vals[key] = newVal;
          log[key] = 'updated';
        }

        if (silentAndLocal) return Promise.resolve();

        let defer = Promise.defer();
        queue.push(defer);
        notify.log('config change: ' + key + ': ' + oldVal + ' -> ' + newVal);
        $rootScope.$broadcast('change:config.' + key, newVal, oldVal);

        // reset the fire timer
        clearTimeout(timer);
        timer = setTimeout(updater.fire, 200);
        return defer.promise;
      };
    };

  };
});
