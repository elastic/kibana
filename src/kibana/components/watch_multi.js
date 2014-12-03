define(function (require) {
  var _ = require('lodash');

  require('modules').get('kibana')
  .config(function ($provide) {

    $provide.decorator('$rootScope', function ($delegate) {
      /**
       * Watch multiple expressions with a single callback. Along
       * with making code simpler it also merges all of the watcher
       * handlers within a single tick.
       *
       * @param  {array[string|function]} expressions - the list of expressions to $watch
       * @param  {Function} fn - the callback function
       * @param  {boolean} deep - should the watchers be created as deep watchers?
       * @return {undefined}
       */
      $delegate.constructor.prototype.$watchMulti = function (expressions, fn, deep) {
        if (!_.isArray(expressions)) throw new TypeError('expected an array of expressions to watch');
        if (!_.isFunction(fn)) throw new TypeError('expexted a function that is triggered on each watch');

        var $scope = this;
        var initQueue = _.clone(expressions);
        var fired = false;
        var vals = {
          new: new Array(expressions.length),
          old: new Array(expressions.length)
        };

        expressions.forEach(function (expr, i) {
          $scope.$watch(expr, function (newVal, oldVal) {
            vals.new[i] = newVal;

            if (initQueue) {
              vals.old[i] = oldVal;

              var qIdx = initQueue.indexOf(expr);
              if (qIdx !== -1) initQueue.splice(qIdx, 1);
              if (initQueue.length === 0) {
                initQueue = false;
                if (fn.length) {
                  fn(vals.new.slice(0), vals.old.slice(0));
                } else {
                  fn();
                }
              }
              return;
            }

            if (fired) return;
            fired = true;
            $scope.$evalAsync(function () {
              fired = false;

              if (fn.length) {
                fn(vals.new.slice(0), vals.old.slice(0));
              } else {
                fn();
              }

              for (var i = 0; i < vals.new.length; i++) {
                vals.old[i] = vals.new[i];
              }
            });
          });
        });
      };

      return $delegate;
    });
  });
});