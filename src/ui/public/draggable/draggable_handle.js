import { uiModules } from '../modules';

uiModules
  .get('kibana')
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
