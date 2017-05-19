import _ from 'lodash';
import { uiModules } from 'ui/modules';
import { FILTER_OPERATOR_TYPES } from './lib/filter_operators';
import template from './filter_editor.html';
import './filter_query_dsl_editor';
import './filter_field_select';
import './filter_operator_select';
import './filter_params_editor';
import './filter_editor.less';
import {
  getQueryDslFromFilter,
  getFieldFromFilter,
  getOperatorFromFilter,
  getParamsFromFilter,
  isFilterValid,
  buildFilter
} from './lib/filter_editor_utils';

const module = uiModules.get('kibana');
module.directive('filterEditor', function ($timeout) {
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
    controller: function ($scope) {
      this.init = (filter) => {
        this.isPinned = _.get(filter, ['$state', 'store']) === 'globalState';
        this.isDisabled = filter.meta.disabled;
        this.alias = filter.meta.alias;
        this.isEditingQueryDsl = false;
        this.queryDsl = getQueryDslFromFilter(filter);
        this.setField(getFieldFromFilter(filter, this.indexPatterns));
        this.setOperator(getOperatorFromFilter(filter));
        this.params = getParamsFromFilter(filter);
        if (filter.meta.isNew) {
          this.setFocus('field');
        }
      };

      $scope.$watch(() => this.filter, this.init);

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

      this.showQueryDslEditor = () => {
        const { type, isNew } = this.filter.meta;
        return this.isEditingQueryDsl || (!isNew && !FILTER_OPERATOR_TYPES.includes(type));
      };

      this.isValid = () => {
        if (this.showQueryDslEditor()) {
          return _.isObject(this.queryDsl);
        }
        const { field, operator, params } = this;
        return isFilterValid({ field, operator, params });
      };

      this.save = () => {
        const { field, operator, params, isPinned, isDisabled, alias } = this;

        let filter;
        if (this.showQueryDslEditor()) {
          const meta = _.pick(this.filter.meta, ['negate', 'index']);
          filter = Object.assign(this.queryDsl, { meta });
        } else {
          filter = buildFilter({ field, operator, params });
        }
        filter.meta.disabled = isDisabled;
        filter.meta.alias = alias;

        return this.onSave({ filter, isPinned });
      };
    }
  };
});
