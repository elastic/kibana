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

import $ from 'jquery';
import { uiModules } from '../../../modules';
import { keyCodes } from '@elastic/eui';

uiModules.get('kibana').directive('visEditorResizer', function() {
  return {
    restrict: 'E',
    link: function($scope, $el) {
      const $left = $el.parent();

      $el.on('mousedown', function(event) {
        $el.addClass('active');
        const startWidth = $left.width();
        const startX = event.pageX;

        function onMove(event) {
          const newWidth = startWidth + event.pageX - startX;
          $left.width(newWidth);
        }

        $(document.body)
          .on('mousemove', onMove)
          .one('mouseup', () => {
            $el.removeClass('active');
            $(document.body).off('mousemove', onMove);
            $scope.$broadcast('render');
          });
      });

      $el.on('keydown', event => {
        const { keyCode } = event;

        if (keyCode === keyCodes.LEFT || keyCode === keyCodes.RIGHT) {
          event.preventDefault();
          const startWidth = $left.width();
          const newWidth = startWidth + (keyCode === keyCodes.LEFT ? -15 : 15);
          $left.width(newWidth);
          $scope.$broadcast('render');
        }
      });
    },
  };
});
