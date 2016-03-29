import $ from 'jquery';
import uiModules from 'ui/modules';

uiModules
.get('app/visualize')
.directive('draggableItem', function () {

  return {
    restrict: 'A',
    require: '^draggableContainer',
    scope: true,
    controllerAs: 'draggableItemCtrl',
    controller($scope, $attrs, $parse) {
      this.getItem = () => $parse($attrs.draggableItem)($scope);
      this.registerHandle = $el => {
        $scope.dragHandles.push(...$el);
      };
    },
    link($scope, $el, attr, ctrl) {
      $scope.dragHandles = $();
    }
  };

});
