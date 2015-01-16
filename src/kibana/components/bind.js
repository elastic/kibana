define(function (require) {
  var _ = require('lodash');

  require('modules').get('kibana')
  .config(function ($provide) {

    $provide.decorator('$rootScope', function ($delegate, $parse) {
      /**
       * Two-way bind a value from scope to another property on scope. This
       * allow values on scope that work like they do in an isolate scope, but
       * without requiring one.
       *
       * @param  {expression} to - the location on scope to bind to
       * @param  {expression} from - the location on scope to bind from
       * @return {undefined}
       */
      $delegate.constructor.prototype.$bind = function (to, from) {
        var $source = this.$parent;
        var $target = this;

        var getter = $parse(from);
        var setter = $parse(to).assign;

        setter($target, getter($source));
        this.$watch(
          function () { return getter($source); },
          function (val) { setter($target, val); }
        );
      };

      return $delegate;
    });
  });
});