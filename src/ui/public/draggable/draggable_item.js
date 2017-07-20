import $ from 'jquery';
import { uiModules } from 'ui/modules';

uiModules
.get('kibana')
.directive('draggableItem', function () {
  return {
    restrict: 'A',
    require: '^draggableContainer',
    scope: true,
    controllerAs: 'draggableItemCtrl',
    controller($scope, $attrs, $parse) {
      const dragHandles = $();

      this.getItem = () => $parse($attrs.draggableItem)($scope);
      this.registerHandle = $el => {
        dragHandles.push(...$el);
      };
      this.moves = handle => {
        const $handle = $(handle);
        const $anywhereInParentChain = $handle.parents().addBack();
        const movable = dragHandles.is($anywhereInParentChain);
        return movable;
      };
    },
    link($scope, $el, attr, draggableController) {
      draggableController.linkDraggableItem($el.get(0), $scope);
    }
  };
});
