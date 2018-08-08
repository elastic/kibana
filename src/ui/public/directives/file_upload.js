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

import _ from 'lodash';
import $ from 'jquery';
import { uiModules } from '../modules';
const module = uiModules.get('kibana');

const html = '<span class="dropzone" ng-transclude></span>';

module.directive('fileUpload', function () {
  return {
    restrict: 'E',
    transclude: true,
    scope: {
      onRead: '&',
      onLocate: '&',
      uploadSelector: '@'
    },
    template: html,
    link: function ($scope, $elem, attrs) {
      const $button = $elem.find($scope.uploadSelector);
      const $dropzone = $elem.find('.dropzone');

      const handleFile = (file) => {
        if (_.isUndefined(file)) return;

        if (_.has(attrs, 'onRead')) {
          const reader = new FileReader();
          reader.onload = function (e) {
            $scope.$apply(function () {
              $scope.onRead({ fileContents: e.target.result });
            });
          };
          reader.readAsText(file);
        }

        if (_.has(attrs, 'onLocate')) {
          $scope.$apply(function () {
            $scope.onLocate({ file });
          });
        }
      };

      $dropzone.on('dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      );

      $dropzone.on('dragenter', function (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      );

      $dropzone.on('drop', function (e) {
        e.stopPropagation();
        e.preventDefault();
        const file = _.get(e, 'originalEvent.dataTransfer.files[0]');

        if (file) {
          handleFile(file);
        }
      });

      if ($button) {
        const $fileInput = $('<input type="file" style="opacity: 0;' +
          ' display:none; position:absolute; right: -999999999px" id="testfile" />');
        $elem.append($fileInput);

        $fileInput.on('change', function (e) {
          const target = e.srcElement || e.target;
          if (_.get(target, 'files.length')) {
            handleFile(target.files[0]);
          }
        });

        $button.on('click', function () {
          $fileInput.val(null);
          $fileInput.trigger('click');
        });
      }
    }
  };
});
