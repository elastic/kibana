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

import 'ui/angular-bootstrap';
import './fancy_forms';
import './sidebar';
import { i18n } from '@kbn/i18n';
import './vis_options';
import './vis_editor_resizer';
import './vis_type_agg_filter';
import $ from 'jquery';

import _ from 'lodash';
import angular from 'angular';
import defaultEditorTemplate from './default.html';
import { keyCodes } from '@elastic/eui';
import { parentPipelineAggHelper } from 'ui/agg_types/metrics/lib/parent_pipeline_agg_helper';
import { DefaultEditorSize } from '../../editor_size';

import { AggGroupNames } from './agg_groups';

import { start as embeddables } from '../../../../../core_plugins/embeddable_api/public/np_ready/public/legacy';

const defaultEditor = function($rootScope, $compile) {
  return class DefaultEditor {
    static key = 'default';

    constructor(el, savedObj) {
      this.el = $(el);
      this.savedObj = savedObj;
      this.vis = savedObj.vis;

      if (!this.vis.type.editorConfig.optionTabs && this.vis.type.editorConfig.optionsTemplate) {
        this.vis.type.editorConfig.optionTabs = [
          {
            name: 'options',
            title: i18n.translate('common.ui.vis.editors.sidebar.tabs.optionsLabel', {
              defaultMessage: 'Options',
            }),
            editor: this.vis.type.editorConfig.optionsTemplate,
          },
        ];
      }
    }

    render({ uiState, timeRange, filters, query, appState }) {
      let $scope;

      const updateScope = () => {
        $scope.vis = this.vis;
        $scope.uiState = uiState;
        //$scope.$apply();
      };

      return new Promise(async resolve => {
        if (!this.$scope) {
          this.$scope = $scope = $rootScope.$new();

          updateScope();

          $scope.state = $scope.vis.copyCurrentState(true);
          $scope.oldState = $scope.vis.getSerializableState($scope.state);

          $scope.toggleSidebar = () => {
            $scope.$broadcast('render');
          };

          this.el.one('renderComplete', resolve);
          // track state of editable vis vs. "actual" vis
          $scope.stageEditableVis = () => {
            $scope.oldState = $scope.vis.getSerializableState($scope.state);
            $scope.vis.setCurrentState($scope.state);
            $scope.vis.updateState();
            $scope.vis.dirty = false;
          };
          $scope.resetEditableVis = () => {
            $scope.state = $scope.vis.copyCurrentState(true);
            $scope.vis.dirty = false;
          };

          $scope.autoApplyEnabled = false;
          if ($scope.vis.type.editorConfig.enableAutoApply) {
            $scope.toggleAutoApply = () => {
              $scope.autoApplyEnabled = !$scope.autoApplyEnabled;
            };

            $scope.$watch(
              'vis.dirty',
              _.debounce(() => {
                if (!$scope.autoApplyEnabled || !$scope.vis.dirty) return;
                $scope.stageEditableVis();
              }, 800)
            );
          }

          $scope.submitEditorWithKeyboard = event => {
            if (event.ctrlKey && event.keyCode === keyCodes.ENTER) {
              event.preventDefault();
              event.stopPropagation();
              $scope.stageEditableVis();
            }
          };

          $scope.getSidebarClass = () => {
            if ($scope.vis.type.editorConfig.defaultSize === DefaultEditorSize.SMALL) {
              return 'visEditor__collapsibleSidebar--small';
            } else if ($scope.vis.type.editorConfig.defaultSize === DefaultEditorSize.MEDIUM) {
              return 'visEditor__collapsibleSidebar--medium';
            } else if ($scope.vis.type.editorConfig.defaultSize === DefaultEditorSize.LARGE) {
              return 'visEditor__collapsibleSidebar--large';
            }
          };

          $scope.$watch(
            () => {
              return $scope.vis.getSerializableState($scope.state);
            },
            function(newState) {
              $scope.vis.dirty = !angular.equals(newState, $scope.oldState);
              const responseAggs = $scope.state.aggs.getResponseAggs();
              $scope.hasHistogramAgg = responseAggs.some(agg => agg.type.name === 'histogram');
              $scope.metricAggs = responseAggs.filter(
                agg => _.get(agg, 'schema.group') === AggGroupNames.Metrics
              );
              const lastParentPipelineAgg = _.findLast(
                $scope.metricAggs,
                ({ type }) => type.subtype === parentPipelineAggHelper.subtype
              );
              $scope.lastParentPipelineAggTitle =
                lastParentPipelineAgg && lastParentPipelineAgg.type.title;
            },
            true
          );

          // fires when visualization state changes, and we need to copy changes to editorState
          $scope.$watch(
            () => {
              return $scope.vis.getCurrentState(false);
            },
            newState => {
              if (!_.isEqual(newState, $scope.oldState)) {
                $scope.state = $scope.vis.copyCurrentState(true);
                $scope.oldState = newState;
              }
            },
            true
          );

          // Load the default editor template, attach it to the DOM and compile it.
          // It should be added to the DOM before compiling, to prevent some resize
          // listener issues.
          const template = $(defaultEditorTemplate);
          this.el.html(template);
          $compile(template)($scope);
        } else {
          $scope = this.$scope;
          updateScope();
        }

        if (!this._handler) {
          const visualizationEl = this.el.find('.visEditor__canvas')[0];

          this._handler = await embeddables
            .getEmbeddableFactory('visualization')
            .createFromObject(this.savedObj, {
              uiState: uiState,
              appState,
              timeRange: timeRange,
              filters: filters || [],
              query: query,
            });
          this._handler.render(visualizationEl);
        } else {
          this._handler.updateInput({
            timeRange: timeRange,
            filters: filters || [],
            query: query,
          });
        }
      });
    }

    resize() {}

    destroy() {
      if (this.$scope) {
        this.$scope.$destroy();
        this.$scope = null;
      }
      if (this._handler) {
        this._handler.destroy();
      }
    }
  };
};

export { defaultEditor };
