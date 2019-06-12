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
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { uiModules } from '../../../modules';
import visOptionsTemplate from './vis_options.html';
import { I18nContext } from 'ui/i18n';

/**
 * This directive sort of "transcludes" in whatever template you pass in via the `editor` attribute.
 * This lets you specify a full-screen UI for editing a vis type, instead of using the regular
 * sidebar.
 */

uiModules
  .get('app/visualize')
  .directive('visEditorVisOptions', function ($compile) {
    return {
      restrict: 'E',
      template: visOptionsTemplate,
      scope: {
        vis: '=',
        visData: '=',
        uiState: '=',
        editor: '=',
        visualizeEditor: '=',
        editorState: '=',
      },
      link: function ($scope, $el) {
        const $optionContainer = $el.find('[data-visualization-options]');

        const reactOptionsComponent = typeof $scope.editor !== 'string';
        const stageEditorParams = (params) => {
          $scope.editorState.params = _.cloneDeep(params);
          $scope.$apply();
        };
        const renderReactComponent = () => {
          const Component = $scope.editor;
          render(
            <I18nContext>
              <Component scope={$scope} editorState={$scope.editorState} stageEditorParams={stageEditorParams} />
            </I18nContext>, $el[0]);
        };
        // Bind the `editor` template with the scope.
        if (reactOptionsComponent) {
          renderReactComponent();
        } else {
          const $editor = $compile($scope.editor)($scope);
          $optionContainer.append($editor);
        }

        $scope.$watchGroup(['visData', 'visualizeEditor', 'editorState.params'], () => {
          if (reactOptionsComponent) {
            renderReactComponent();
          }
        });

        $scope.$watch('vis.type.schemas.all.length', function (len) {
          $scope.alwaysShowOptions = len === 0;
        });

        $el.on('$destroy', () => {
          if (reactOptionsComponent) {
            unmountComponentAtNode($el[0]);
          }
        });
      }
    };
  });
