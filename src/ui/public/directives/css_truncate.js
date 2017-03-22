import uiModules from 'ui/modules';
const module = uiModules.get('kibana');

module.directive('cssTruncate', function () {
  return {
    restrict: 'A',
    scope: {},
    link: function ($scope, $elem, attrs) {

      $elem.css({
        overflow: 'hidden',
        'white-space': 'nowrap',
        'text-overflow': 'ellipsis',
        'word-break': 'break-all',
      });

      if (attrs.cssTruncateExpandable != null) {
        $scope.$watch(
          function () { return $elem.html(); },
          function () {
            if ($elem[0].offsetWidth < $elem[0].scrollWidth) {
              $elem.css({ 'cursor': 'pointer' });
              $elem.bind('click', function () {
                $scope.toggle();
              });
            }
          }
        );
      }

      $scope.toggle = function () {
        if ($elem.css('white-space') !== 'normal') {
          $elem.css({ 'white-space': 'normal' });
        } else {
          $elem.css({ 'white-space': 'nowrap' });
        }
      };

      $scope.$on('$destroy', function () {
        $elem.unbind('click');
        $elem.unbind('mouseenter');
      });
    }
  };
});
