define(function (require) {
  require('modules')
  .get('app/visualize')
  .directive('visAggParamEditor', function () {
    return {
      restrict: 'E',
      scope: {
        aggType: '=',
        aggConfig: '=',
        aggParam: '=',
        params: '='
      },
      template: function ($el, attr) {
        return $el.html();
      }
    };
  });
});