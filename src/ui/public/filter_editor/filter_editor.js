import _ from 'lodash';
import { uiModules } from 'ui/modules';
import { FILTER_OPERATOR_TYPES } from './lib/filter_operators';
import template from './filter_editor.html';
import './filter_query_dsl_editor';
import './filter_field_select';
import './filter_operator_select';
import './filter_editor.less';
import '../filters/sort_prefix_first';
import '../directives/ui_select_focus_on';
import {
  getQueryDslFromFilter,
  getFieldFromFilter,
  getOperatorFromFilter,
  getParamsFromFilter,
  isFilterValid,
  buildFilter
} from './lib/filter_editor_utils';

const module = uiModules.get('kibana');
module.directive('filterEditor', function ($http, $timeout) {
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

      $scope.compactUnion = _.flow(_.union, _.compact);

      this.setQueryDsl = (queryDsl) => {
        this.queryDsl = queryDsl;
      };

      this.setField = (field) => {
        this.field = field;
        this.operator = null;
        this.params = {};
        this.valueSuggestions = [];
      };

      this.onFieldSelect = (field) => {
        this.setField(field);
        this.setFocus('operator');
      };

      this.setOperator = (operator) => {
        this.operator = operator;
        const type = _.get(operator, 'type');
        if (type === 'phrase' || type === 'phrases') {
          this.refreshValueSuggestions();
        }
      };

      this.onOperatorSelect = (operator) => {
        this.setOperator(operator);
        this.setFocus('params');
      };

      this.setFocus = (name) => {
        $timeout(() => $scope.$broadcast(`focus-${name}`));
      };

      this.refreshValueSuggestions = (query) => {
        return this.getValueSuggestions(this.field, query)
          .then(suggestions => this.valueSuggestions = suggestions);
      };

      this.getValueSuggestions = _.memoize(getValueSuggestions, getFieldQueryHash);

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

      function getValueSuggestions(field, query) {
        if (!_.get(field, 'aggregatable') || field.type !== 'string') {
          return Promise.resolve([]);
        }

        const params = {
          query,
          field: field.name
        };

        return $http.post(`../api/kibana/suggestions/values/${field.indexPattern.id}`, params)
          .then(response => response.data);
      }

      function getFieldQueryHash(field, query) {
        return `${field.indexPattern.id}/${field.name}/${query}`;
      }
    }
  };
});
