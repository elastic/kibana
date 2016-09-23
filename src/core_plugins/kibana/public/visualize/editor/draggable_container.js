import _ from 'lodash';
import $ from 'jquery';
import dragula from 'dragula';
import uiModules from 'ui/modules';

uiModules
.get('app/visualize')
.directive('draggableContainer', function () {

  return {
    restrict: 'A',
    scope: true,
    controllerAs: 'draggableContainerCtrl',
    controller($scope, $attrs, $parse) {
      this.getList = () => $parse($attrs.draggableContainer)($scope);
    },
    link($scope, $el, attr) {
      const drake = dragula({
        containers: $el.toArray(),
        moves(el, source, handle) {
          const itemScope = $(el).scope();
          if (!('draggableItemCtrl' in itemScope)) {
            return; // only [draggable-item] is draggable
          }
          return itemScope.draggableItemCtrl.moves(handle);
        }
      });

      const drakeEvents = [
        'cancel',
        'cloned',
        'drag',
        'dragend',
        'drop',
        'out',
        'over',
        'remove',
        'shadow'
      ];
      const prettifiedDrakeEvents = {
        drag: 'start',
        dragend: 'end'
      };

      drakeEvents.forEach(type => {
        drake.on(type, (el, ...args) => forwardEvent(type, el, ...args));
      });
      drake.on('drag', markDragging(true));
      drake.on('dragend', markDragging(false));
      drake.on('drop', drop);
      $scope.$on('$destroy', drake.destroy);
      $scope.drake = drake;

      function markDragging(isDragging) {
        return el => {
          const scope = $(el).scope();
          scope.isDragging = isDragging;
          scope.$apply();
        };
      }

      function forwardEvent(type, el, ...args) {
        const name = `drag-${prettifiedDrakeEvents[type] || type}`;
        const scope = $(el).scope();
        scope.$broadcast(name, el, ...args);
      }

      function drop(el, target, source, sibling) {
        const list = $scope.draggableContainerCtrl.getList();
        const itemScope = $(el).scope();
        const item = itemScope.draggableItemCtrl.getItem();
        const fromIndex = list.indexOf(item);
        const siblingIndex = getItemIndexFromElement(list, sibling);

        const toIndex = getTargetIndex(list, fromIndex, siblingIndex);
        _.move(list, item, toIndex);
      }

      function getTargetIndex(list, fromIndex, siblingIndex) {
        if (siblingIndex === -1) {
          // means the item was dropped at the end of the list
          return list.length - 1;
        } else if (fromIndex < siblingIndex) {
          // An item moving from a lower index to a higher index will offset the
          // index of the earlier items by one.
          return siblingIndex - 1;
        }
        return siblingIndex;
      }

      function getItemIndexFromElement(list, element) {
        if (!element) return -1;

        const scope = $(element).scope();
        const item = scope.draggableItemCtrl.getItem();
        const index = list.indexOf(item);

        return index;
      }
    }
  };

});
