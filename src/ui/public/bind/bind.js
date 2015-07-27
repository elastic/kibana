define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');

  require('ui/modules').get('kibana')
  .config(function ($provide) {

    function strictEquality(a, b) {
      // are the values equal? or, are they both NaN?
      return a === b || (a !== a && b !== b);
    }

    function errorNotAssignable(source, target) {
      throw Error('Unable to accept change to bound $scope property "' + source + '"' +
        ' because source expression "' + target + '" is not assignable!');
    }

    $provide.decorator('$rootScope', function ($delegate, $parse) {
      /**
       * Two-way bind a value from scope to another property on scope. This
       * allow values on scope that work like they do in an isolate scope, but
       * without requiring one.
       *
       * @param  {expression} to - the location on scope to bind to
       * @param  {expression} from - the location on scope to bind from
       * @param  {Scope} $sourceScope - the scope to read "from" expression from
       * @return {undefined}
       */
      $delegate.constructor.prototype.$bind = function (to, from, $sourceScope) {
        var $source = $sourceScope || this.$parent;
        var $target = this;

        // parse expressions
        var $to = $parse(to);
        if (!$to.assign) errorNotAssignable(to, from);
        var $from = $parse(from);
        $from.assignOrFail = $from.assign || function () {
          // revert the change and throw an error, child writes aren't supported
          $to($target, lastSourceVal = $from($source));
          errorNotAssignable(from, to);
        };

        // bind scopes to expressions
        var getTarget = function () { return $to($target); };
        var setTarget = function (v) { return $to.assign($target, v); };
        var getSource = function () { return $from($source); };
        var setSource = function (v) { return $from.assignOrFail($source, v); };

        // if we are syncing down a literal, then we use loose equality check
        var strict = !$from.literal;
        var compare = strict ? strictEquality : angular.equals;

        // to support writing from the child to the parent we need to know
        // which source has changed. Track the source value and anytime it
        // changes (even if the target value changed too) push from source
        // to target. If the source hasn't changed then the change is from
        // the target and push accordingly
        var lastSourceVal = getSource();

        // push the initial value down, start off in sync
        setTarget(lastSourceVal);

        $target.$watch(function () {
          var sourceVal = getSource();
          var targetVal = getTarget();

          var outOfSync = !compare(sourceVal, targetVal);
          var sourceChanged = outOfSync && !compare(sourceVal, lastSourceVal);

          if (sourceChanged) setTarget(sourceVal);
          else if (outOfSync) setSource(targetVal);

          return lastSourceVal = sourceVal;
        }, null, !strict);
      };

      return $delegate;
    });
  });
});
