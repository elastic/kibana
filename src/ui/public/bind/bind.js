import angular from 'angular';
import { uiModules } from 'ui/modules';

uiModules.get('kibana')
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
      const $source = $sourceScope || this.$parent;
      const $target = this;

      // parse expressions
      const $to = $parse(to);
      if (!$to.assign) errorNotAssignable(to, from);
      const $from = $parse(from);

      // bind scopes to expressions
      const getTarget = function () { return $to($target); };
      const setTarget = function (v) { return $to.assign($target, v); };
      const getSource = function () { return $from($source); };
      const setSource = function (v) { return $from.assignOrFail($source, v); };

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
      const strict = !$from.literal;
      const compare = strict ? strictEquality : angular.equals;


      // push the initial value down, start off in sync
      setTarget(lastSourceVal);

      $target.$watch(function () {
        const sourceVal = getSource();
        const targetVal = getTarget();

        const outOfSync = !compare(sourceVal, targetVal);
        const sourceChanged = outOfSync && !compare(sourceVal, lastSourceVal);

        if (sourceChanged) setTarget(sourceVal);
        else if (outOfSync) setSource(targetVal);

        return lastSourceVal = sourceVal;
      }, null, !strict);
    };

    return $delegate;
  });
});
