define(function (require) {
  let _ = require('lodash');
  let angular = require('angular');

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
        let $source = $sourceScope || this.$parent;
        let $target = this;

        // parse expressions
        let $to = $parse(to);
        if (!$to.assign) errorNotAssignable(to, from);
        let $from = $parse(from);

        // bind scopes to expressions
        let getTarget = function () { return $to($target); };
        let setTarget = function (v) { return $to.assign($target, v); };
        let getSource = function () { return $from($source); };
        let setSource = function (v) { return $from.assignOrFail($source, v); };

        // to support writing from the child to the parent we need to know
        // which source has changed. Track the source value and anytime it
        // changes (even if the target value changed too) push from source
        // to target. If the source hasn't changed then the change is from
        // the target and push accordingly
        let lastSourceVal = getSource();

        $from.assignOrFail = $from.assign || function () {
          // revert the change and throw an error, child writes aren't supported
          $to($target, lastSourceVal = $from($source));
          errorNotAssignable(from, to);
        };

        // if we are syncing down a literal, then we use loose equality check
        let strict = !$from.literal;
        let compare = strict ? strictEquality : angular.equals;


        // push the initial value down, start off in sync
        setTarget(lastSourceVal);

        $target.$watch(function () {
          let sourceVal = getSource();
          let targetVal = getTarget();

          let outOfSync = !compare(sourceVal, targetVal);
          let sourceChanged = outOfSync && !compare(sourceVal, lastSourceVal);

          if (sourceChanged) setTarget(sourceVal);
          else if (outOfSync) setSource(targetVal);

          return lastSourceVal = sourceVal;
        }, null, !strict);
      };

      return $delegate;
    });
  });
});
