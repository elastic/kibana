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
import { uiModules } from '../modules';
import { callAfterBindingsWorkaround } from '../compat';
import { FILTER_OPERATOR_TYPES } from './lib/filter_operators';
import template from './filter_editor.html';
import '../directives/documentation_href';
import './filter_query_dsl_editor';
import './filter_field_select';
import './filter_operator_select';
import './params_editor/filter_params_editor';
import './filter_editor.less';
import {
  getQueryDslFromFilter,
  getFieldFromFilter,
  getOperatorFromFilter,
  getParamsFromFilter,
  isFilterValid,
  buildFilter,
  areIndexPatternsProvided,
  isFilterPinned
} from './lib/filter_editor_utils';
import * as filterBuilder from '@kbn/es-query';
import { keyMap } from '../utils/key_map';

const module = uiModules.get('kibana');
module.directive('filterEditor', function ($timeout, indexPatterns) {
  return {
    restrict: 'E',
    template,
    scope: {
      indexPatterns: '=',
      filter: '=',
      onDelete: '&',
      onCancel: '&',
      onSave: '&'
    },
    controllerAs: 'filterEditor',
    bindToController: true,
    controller: callAfterBindingsWorkaround(function ($scope, $element, config) {
      const pinnedByDefault = config.get('filters:pinnedByDefault');

      this.init = async () => {
        if (!areIndexPatternsProvided(this.indexPatterns)) {
          const defaultIndexPattern = await indexPatterns.getDefault();
          if (defaultIndexPattern) {
            this.indexPatterns = [defaultIndexPattern];
          }
        }
        const { filter } = this;
        this.alias = filter.meta.alias;
        this.isEditingQueryDsl = false;
        this.queryDsl = getQueryDslFromFilter(filter);
        if (filter.meta.isNew) {
          this.setFocus('field');
        } else {
          getFieldFromFilter(filter, indexPatterns)
            .then((field) => {
              this.setField(field);
              this.setOperator(getOperatorFromFilter(filter));
              this.params = getParamsFromFilter(filter);
            });
        }
      };

      $scope.$watch(() => this.filter, this.init);
      $scope.$watchCollection(() => this.filter.meta, this.init);

      this.setQueryDsl = (queryDsl) => {
        this.queryDsl = queryDsl;
      };

      this.setField = (field) => {
        this.field = field;
        this.operator = null;
        this.params = {};
      };

      this.onFieldSelect = (field) => {
        this.setField(field);
        this.setFocus('operator');
      };

      this.setOperator = (operator) => {
        this.operator = operator;
      };

      this.onOperatorSelect = (operator) => {
        this.setOperator(operator);
        this.setFocus('params');
      };

      this.setParams = (params) => {
        this.params = params;
      };

      this.setFocus = (name) => {
        $timeout(() => $scope.$broadcast(`focus-${name}`));
      };

      this.toggleEditingQueryDsl = () => {
        this.isEditingQueryDsl = !this.isEditingQueryDsl;
      };

      this.isQueryDslEditorVisible = () => {
        const { type, isNew } = this.filter.meta;
        return this.isEditingQueryDsl || (!isNew && !FILTER_OPERATOR_TYPES.includes(type));
      };

      this.isValid = () => {
        if (this.isQueryDslEditorVisible()) {
          return _.isObject(this.queryDsl);
        }
        const { field, operator, params } = this;
        return isFilterValid({ field, operator, params });
      };

      this.save = () => {
        const { filter, field, operator, params, alias } = this;

        let newFilter;
        if (this.isQueryDslEditorVisible()) {
          const meta = _.pick(filter.meta, ['negate', 'index']);
          meta.index = meta.index || this.indexPatterns[0].id;
          newFilter = Object.assign(this.queryDsl, { meta });
        } else {
          const indexPattern = field.indexPattern;
          newFilter = buildFilter({ indexPattern, field, operator, params, filterBuilder });
        }
        newFilter.meta.disabled = filter.meta.disabled;
        newFilter.meta.alias = alias;
        const isPinned = isFilterPinned(filter, pinnedByDefault);
        return this.onSave({ filter, newFilter, isPinned });
      };

      $element.on('keydown', (event) => {
        if (keyMap[event.keyCode] === 'escape') {
          $timeout(() => this.onCancel());
        }
      });
    })
  };
});
