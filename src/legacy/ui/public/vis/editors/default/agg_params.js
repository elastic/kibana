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
import { get } from 'lodash';
import { aggTypes } from '../../../agg_types';
import { aggTypeFilters } from '../../../agg_types/filter';
import { aggTypeFieldFilters } from '../../../agg_types/param_types/filter';
import { uiModules } from '../../../modules';
import { editorConfigProviders } from '../config/editor_config_providers';
import advancedToggleHtml from './advanced_toggle.html';
import './agg_param';
import './agg_select';
import aggParamsTemplate from './agg_params.html';
import { groupAggregationsBy } from './default_editor_utils';

uiModules
  .get('app/visualize')
  .directive('visEditorAggParams', function ($compile) {

    return {
      restrict: 'E',
      template: aggParamsTemplate,
      scope: true,
      link: function ($scope, $el, attr) {
        $scope.$bind('agg', attr.agg);
        $scope.$bind('groupName', attr.groupName);
        $scope.$bind('indexPattern', attr.indexPattern);

        $scope.aggTypeOptions = aggTypeFilters
          .filter(aggTypes.byType[$scope.groupName], $scope.indexPattern, $scope.agg);

        $scope.advancedToggled = false;

        // We set up this watch prior to adding the controls below, because when the controls are added,
        // there is a possibility that the agg type can be automatically selected (if there is only one)
        $scope.$watch('agg.type', () => {
          updateAggParamEditor();
          updateEditorConfig('default');
        });

        $scope.groupedAggTypeOptions = groupAggregationsBy($scope.aggTypeOptions, 'subtype');
        $scope.isSubAggregation = $scope.$index >= 1 && $scope.groupName === 'buckets';

        $scope.onAggTypeChange = (agg, value) => {
          if (agg.type !== value) {
            agg.type = value;
          }
        };

        $scope.onParamChange = (agg, paramName, value) => {
          if(agg.params[paramName] !== value) {
            agg.params[paramName] = value;
          }
        };

        function updateEditorConfig(property = 'fixedValue') {
          $scope.editorConfig = editorConfigProviders.getConfigForAgg(
            aggTypes.byType[$scope.groupName],
            $scope.indexPattern,
            $scope.agg
          );

          Object.keys($scope.editorConfig).forEach(param => {
            const config = $scope.editorConfig[param];
            const paramOptions = $scope.agg.type.params.find((paramOption) => paramOption.name === param);
            // If the parameter has a fixed value in the config, set this value.
            // Also for all supported configs we should freeze the editor for this param.
            if (config.hasOwnProperty(property)) {
              if(paramOptions && paramOptions.deserialize) {
                $scope.agg.params[param] = paramOptions.deserialize(config[property]);
              } else {
                $scope.agg.params[param] = config[property];
              }
            }
          });
        }

        updateEditorConfig();
        $scope.$watchCollection('agg.params', updateEditorConfig);

        // this will contain the controls for the schema (rows or columns?), which are unrelated to
        // controls for the agg, which is why they are first
        addSchemaEditor();

        function addSchemaEditor() {
          const $schemaEditor = $('<div>').addClass('schemaEditors form-group').appendTo($el);

          if ($scope.agg.schema.editor) {
            $schemaEditor.append($scope.agg.schema.editor);
            $compile($schemaEditor)($scope.$new());
          }
        }

        // params for the selected agg, these are rebuilt every time the agg in $aggSelect changes
        let $aggParamEditors; //  container for agg type param editors
        let $aggParamEditorsScope;

        function updateAggParamEditor() {
          updateEditorConfig();

          if ($aggParamEditors) {
            $aggParamEditors.remove();
            $aggParamEditors = null;
          }

          // if there's an old scope, destroy it
          if ($aggParamEditorsScope) {
            $aggParamEditorsScope.$destroy();
            $aggParamEditorsScope = null;
          }

          if (!$scope.agg || !$scope.agg.type) {
            return;
          }

          // create child scope, used in the editors
          $aggParamEditorsScope = $scope.$new();
          const aggParamHTML = {
            basic: [],
            advanced: []
          };

          // build collection of agg params html
          $scope.agg.type.params
            // Filter out, i.e. don't render, any parameter that is hidden via the editor config.
            .filter(param => !get($scope, ['editorConfig', param.name, 'hidden'], false))
            .forEach(function (param, i) {
              let aggParam;
              let fields;
              if ($scope.agg.schema.hideCustomLabel && param.name === 'customLabel') {
                return;
              }
              // if field param exists, compute allowed fields
              if (param.type === 'field') {
                const availableFields = param.getAvailableFields($scope.agg.getIndexPattern().fields);
                fields = $aggParamEditorsScope[`${param.name}Options`] =
                  aggTypeFieldFilters.filter(availableFields, param.type, $scope.agg, $scope.vis);
                $scope.indexedFields = groupAggregationsBy(fields, 'type', 'displayName');
              }

              if (fields) {
                const hasIndexedFields = fields.length > 0;
                const isExtraParam = i > 0;
                if (!hasIndexedFields && isExtraParam) { // don't draw the rest of the options if there are no indexed fields.
                  return;
                }
              }


              let type = 'basic';
              if (param.advanced) type = 'advanced';

              if (aggParam = getAggParamHTML(param, i)) {
                aggParamHTML[type].push(aggParam);
              }

            });

          // compile the paramEditors html elements
          let paramEditors = aggParamHTML.basic;

          if (aggParamHTML.advanced.length) {
            paramEditors.push($(advancedToggleHtml).get(0));
            paramEditors = paramEditors.concat(aggParamHTML.advanced);
          }

          $aggParamEditors = $(paramEditors).appendTo($el);
          $compile($aggParamEditors)($aggParamEditorsScope);
        }

        // build HTML editor given an aggParam and index
        function getAggParamHTML(param, idx) {
        // don't show params without an editor
          if (!param.editor && !param.editorComponent) {
            return;
          }

          const attrs = {
            'agg-param': 'agg.type.params[' + idx + ']',
            'agg': 'agg',
          };

          if (param.advanced) {
            attrs['ng-show'] = 'advancedToggled';
          }

          if (param.editorComponent) {
            attrs['editor-component'] = `agg.type.params[${idx}].editorComponent`;
            attrs['indexed-fields'] = 'indexedFields';
            // The form should interact with reactified components as well.
            // So we set the ng-model (using a random ng-model variable) to have the method to set dirty
            // inside the  agg_param.js directive, which can get access to the ngModelController to manipulate it.
            attrs['ng-model'] = normalizeModelName(`_internalNgModelState${$scope.agg.id}${param.name}`);
          }

          return $('<vis-agg-param-editor>')
            .attr(attrs)
            .append(param.editor)
            .get(0);
        }

        function normalizeModelName(modelName = '') {
          return modelName.replace(/-/g, '_');
        }
      }
    };
  });
