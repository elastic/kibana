import uiModules from 'ui/modules';

uiModules
.get('app/visualize')
.directive('draggableHandle', function () {
  return {
    restrict: 'A',
    require: '^draggableItem',
    link($scope, $el, attr, ctrl) {
      ctrl.registerHandle($el);
      $el.addClass('gu-handle');
    }
  };
});
