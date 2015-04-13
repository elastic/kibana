define(function (require) {
  var _ = require('lodash');

  require('modules').get('kibana')
  .config(function ($provide) {

    $provide.decorator('$rootScope', function ($delegate, $parse) {
      /**
       * Consumes an expression to create a getter for the current $scope
       *
       * @param  {String} expression - the expressions to evaluate on scope
       * @param  {Object} locals - local variables, useful for overriding values in $scope
       * @return {function} - a function that when called executes the expression
       *                      on scope and returns the value
       */
      $delegate.constructor.prototype.$getter = function (expression, locals) {
        var $scope = this;
        getter.$$compiledExpression = $parse(expression);

        function getter() {
          return getter.$$compiledExpression($scope, locals);
        }

        return getter;
      };

      return $delegate;
    });
  });
});
