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
import { uiModules } from 'ui/modules';
import { I18nContext } from 'ui/i18n';
import { fromExpression } from '@kbn/interpreter/common';
import { AggConfigs } from 'ui/vis/agg_configs';

/**
 * This directive sort of "transcludes" in whatever template you pass in via the `editor` attribute.
 * This lets you specify a full-screen UI for editing a vis type, instead of using the regular
 * sidebar.
 */

import { VisExprComponent } from './vis_expr_component';
import { buildPipeline } from '../../../../../ui/public/visualize/loader/pipeline_helpers';

uiModules
  .get('app/visualize')
  .directive('visEditorExpression', function () {
    return {
      restrict: 'E',
      scope: true,
      // scope: {
      //   vis: '=',
      //   visData: '=',
      //   uiState: '=',
      //   editor: '=',
      //   visualizeEditor: '=',
      //   editorState: '=',
      //   savedVis: '=',
      //   timeRange: '=',
      //   filters: '=',
      // },
      link: function ($scope, $el) {
        const stageEditorParams = (aggs, params) => {
          const aggs_ = new AggConfigs($scope.vis.indexPattern, aggs);
          aggs_.forEach((agg, i) => {
            _.merge($scope.state.aggs[i].params, agg.params);
          })
          $scope.state.params = _.cloneDeep(params);
          $scope.stageEditableVis();
        };

        $scope.form = { expression: '' };

        // called when we run expression. should update configuration and run it
        const setExpression = (expr) => {
          const ast = fromExpression(expr);
          const visConfig = JSON.parse(ast.chain[ast.chain.length - 1].arguments.visConfig);
          const aggs = JSON.parse(ast.chain[2].arguments.aggConfigs[0]);
          stageEditorParams(aggs, visConfig);
          //$scope.$apply();
        };

        const updateValue = (val) => {
          $scope.form.expression = val;
          renderReactComponent();
        }

        const renderReactComponent = () => {
          render(
            <I18nContext>
              <VisExprComponent
                form={$scope.form}
                editorState={$scope.editorState}
                stageEditorParams={stageEditorParams}
                setExpression={setExpression}
                updateValue={updateValue}
              />
            </I18nContext>, $el[0]);
        };

        renderReactComponent();

        $scope.$watchGroup(['vis.params', 'vis.aggs', 'editorState.params'], () => {
          $scope.form.expression = buildPipeline($scope.vis, {
            searchSource: $scope.savedObj.searchSource,
            timeRange: $scope.savedObj.timeRange,
          });
          renderReactComponent();
        });

        $el.on('$destroy', () => {
          unmountComponentAtNode($el[0]);
        });
      }
    };
  });
