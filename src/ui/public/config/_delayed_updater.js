import _ from 'lodash';
import angular from 'angular';
import ConfigValsProvider from 'ui/config/_vals';
import Notifier from 'ui/notify/notifier';

export default function DelayedUpdaterFactory(Private, $rootScope, Promise) {
  var notify = new Notifier();

  var vals = Private(ConfigValsProvider);

  return function DelayedUpdater(doc) {
    var updater = this;
    var queue = [];
    var log = {};
    let timer;

    updater.fire = function () {
      clearTimeout(timer);

      // only fire once
      if (updater.fired) return;
      updater.fired = true;

      let method;
      let body;
      var updated = [];
      var deleted = [];

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
      var newVal = val;
      var oldVal = vals[key];

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

      var defer = Promise.defer();
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
