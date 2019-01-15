/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import dragula from 'dragula';
import 'dragula/dist/dragula.css';
import { uiModules } from '../modules';
import { move } from '../utils/collection';

uiModules
  .get('kibana')
  .directive('draggableContainer', function () {

    const $scopes = new WeakMap();

    return {
      restrict: 'A',
      scope: true,
      controllerAs: 'draggableContainerCtrl',
      controller($scope, $attrs, $parse, $element) {
        $scopes.set($element.get(0), $scope);
        this.linkDraggableItem = (el, $scope) => {
          $scopes.set(el, $scope);
        };

        this.getList = () => $parse($attrs.draggableContainer)($scope);
      },
      link($scope, $el) {
        const drake = dragula({
          containers: $el.toArray(),
          moves(el, source, handle) {
            const itemScope = $scopes.get(el);
            if (!itemScope || !('draggableItemCtrl' in itemScope)) {
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
            const scope = $scopes.get(el);
            if (!scope) return;
            scope.isDragging = isDragging;
            scope.$apply();
          };
        }

        function forwardEvent(type, el, ...args) {
          const name = `drag-${prettifiedDrakeEvents[type] || type}`;
          const scope = $scopes.get(el);
          if (!scope) return;
          scope.$broadcast(name, el, ...args);
        }

        function drop(el, target, source, sibling) {
          const list = $scope.draggableContainerCtrl.getList();
          const itemScope = $scopes.get(el);
          if (!itemScope) return;
          const item = itemScope.draggableItemCtrl.getItem();
          const fromIndex = list.indexOf(item);
          const siblingIndex = getItemIndexFromElement(list, sibling);

          const toIndex = getTargetIndex(list, fromIndex, siblingIndex);
          move(list, item, toIndex);
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

          const scope = $scopes.get(element);
          if (!scope) return;
          const item = scope.draggableItemCtrl.getItem();
          const index = list.indexOf(item);

          return index;
        }
      }
    };

  });
