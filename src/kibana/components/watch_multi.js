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
       * # expression format
       * expressions can be specified in one of the following ways:
       * 1. string that evaluates to a value on scope. Creates a regular $watch
       *    expression.
       *     'someScopeValue.prop' === $scope.$watch('someScopeValue.prop', fn);
       *
       * 2. #1 prefixed with '[]', which uses $watchCollection rather than $watch.
       *     '[]expr' === $scope.$watchCollection('expr', fn);
       *
       * 3. #1 prefixed with '=', which uses $watch with objectEquality turned on
       *     '=expr' === $scope.$watch('expr', fn, true);
       *
       * 4. a function that will be called, like a normal function water
       *
       * 5. an object with any of the properties:
       *   `get`: the getter called on each itteration
       *   `deep`: a flag to turn on objectEquality in $watch
       *   `fn`: the watch registration function ($scope.$watch or $scope.$watchCollection)
       *
       * @param  {array[string|function|obj]} expressions - the list of expressions to $watch
       * @param  {Function} fn - the callback function
       * @param  {boolean} deep - should the watchers be created as deep watchers?
       * @return {undefined}
       */
      $delegate.constructor.prototype.$watchMulti = function (expressions, fn, deep) {
        if (!_.isArray(expressions)) throw new TypeError('expected an array of expressions to watch');
        if (!_.isFunction(fn)) throw new TypeError('expexted a function that is triggered on each watch');

        var $scope = this;
        var fired = false;
        var queue = [];
        var vals = new Array(expressions.length);
        var prev = new Array(expressions.length);

        function normalizeExpression(expr) {
          if (!expr) return;

          var norm = {
            fn: $scope.$watch,
            deep: false
          };

          if (_.isFunction(expr)) return _.assign(norm, { get: expr });
          if (_.isObject(expr)) return _.assign(norm, expr);
          if (!_.isString(expr)) return;

          if (expr.substr(0, 2) === '[]') {
            return _.assign(norm, {
              fn: $scope.$watchCollection,
              get: expr.substr(2)
            });
          }

          if (expr.charAt(0) === '=') {
            return _.assign(norm, {
              deep: true,
              get: expr.substr(1)
            });
          }

          return _.assign(norm, { get: expr });
        }

        expressions.forEach(function (expr, i) {
          expr = normalizeExpression(expr);
          if (!expr) return;

          queue.push(expr);
          expr.fn.call($scope, expr.get, function (newVal, oldVal) {
            vals[i] = newVal;

            if (queue) {
              prev[i] = oldVal;
              _.pull(queue, expr);
              if (queue.length > 0) return;
              queue = false;
            }

            if (fired) return;
            fired = true;
            $scope.$evalAsync(function () {
              fired = false;

              if (fn.length) {
                fn(vals.slice(0), prev.slice(0));
              } else {
                fn();
              }

              for (var i = 0; i < vals.length; i++) {
                prev[i] = vals[i];
              }
            });
          }, expr.deep);
        });
      };

      return $delegate;
    });
  });
});