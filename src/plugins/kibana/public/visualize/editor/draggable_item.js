import $ from 'jquery';
import uiModules from 'ui/modules';

uiModules
.get('app/visualize')
.directive('draggableItem', function () {
  return {
    restrict: 'A',
    require: '^draggableContainer',
    scope: true,
    bindToController: true,
    controllerAs: 'draggableItemCtrl',
    controller($scope, $attrs, $parse) {
      this.getItem = () => $parse($attrs.draggableItem)($scope);
      this.registerHandle = $el => {
        this.dragHandles = this.dragHandles || $();
        this.dragHandles.push(...$el);
      };
    }
  };
});
