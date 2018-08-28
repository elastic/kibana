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

import 'ace';
import _ from 'lodash';
import { uiModules } from '../modules';
import template from './filter_query_dsl_editor.html';
import '../accessibility/kbn_ui_ace_keyboard_mode';

const module = uiModules.get('kibana');
module.directive('filterQueryDslEditor', function () {
  return {
    restrict: 'E',
    template,
    scope: {
      isVisible: '=',
      filter: '=',
      onChange: '&'
    },
    link: {
      pre: function ($scope) {
        let aceEditor;

        $scope.queryDsl = _.omit($scope.filter, ['meta', '$state']);
        $scope.aceLoaded = function (editor) {
          aceEditor = editor;
          editor.$blockScrolling = Infinity;
          const session = editor.getSession();
          session.setTabSize(2);
          session.setUseSoftTabs(true);
        };

        $scope.$watch('isVisible', isVisible => {
          // Tell the editor to re-render itself now that it's visible, otherwise it won't
          // show up in the UI.
          if (isVisible && aceEditor) {
            aceEditor.renderer.updateFull();
          }
        });
      }
    }
  };
});
