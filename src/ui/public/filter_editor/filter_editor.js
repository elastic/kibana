import _ from 'lodash';
import { uiModules } from 'ui/modules';
import template from './filter_editor.html';
import { FILTER_OPERATORS, FILTER_OPERATOR_TYPES } from './lib/filter_operators';
import { buildExistsFilter, buildPhraseFilter, buildRangeFilter, buildPhrasesFilter } from '../filter_manager/lib';
import '../filters/sort_prefix_first';
import '../directives/ui_select_focus_on';
import './filter_query_dsl_editor';
import './filter_field_select';
import './filter_operator_select';
import './filter_editor.less';

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
      $scope.$watch(() => this.indexPatterns, (indexPatterns) => {
        this.fieldOptions = getFieldOptions(indexPatterns);
      });

      $scope.compactUnion = _.flow(_.union, _.compact);

      this.setQueryDsl = (queryDsl) => {
        this.queryDsl = queryDsl;
      };

      this.setField = (field) => {
        this.field = field;
        this.operator = null;
        this.params = {};
        this.valueSuggestions = [];
        this.operatorOptions = getOperatorOptions(field);
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
        } else if (!this.field || !this.operator) {
          return false;
        } else if (this.operator.type === 'phrase') {
          return _.has(this.params, 'value') && this.params.value !== '';
        } else if (this.operator.type === 'phrases') {
          return _.has(this.params, 'values') && this.params.values.length > 0;
        } else if (this.operator.type === 'range') {
          const hasFrom = _.has(this.params, 'from') && this.params.from !== '';
          const hasTo = _.has(this.params, 'to') && this.params.to !== '';
          return hasFrom || hasTo;
        }
        return true;
      };

      this.save = () => {
        const { field, operator, params, isPinned, isDisabled, alias } = this;

        let filter;
        if (this.showQueryDslEditor()) {
          const meta = _.pick(this.filter.meta, ['negate', 'index']);
          filter = Object.assign(this.queryDsl, { meta });
        } else {
          if (operator.type === 'phrase') {
            filter = buildPhraseFilter(field, params.value, field.indexPattern);
          } else if (operator.type === 'phrases') {
            filter = buildPhrasesFilter(field, params.values, field.indexPattern);
          } else if (operator.type === 'range') {
            filter = buildRangeFilter(field, { gte: params.from, lt: params.to }, field.indexPattern);
          } else if (operator.type === 'exists') {
            filter = buildExistsFilter(field, field.indexPattern);
          }
          filter.meta.negate = operator.negate;
        }
        filter.meta.disabled = isDisabled;
        filter.meta.alias = alias;

        return this.onSave({ filter, isPinned });
      };

      function getQueryDslFromFilter(filter) {
        return _(filter)
          .omit(['meta', '$state'])
          .cloneDeep();
      }

      function getFieldFromFilter(filter, indexPatterns) {
        const { index, key } = filter.meta;
        const indexPattern = indexPatterns.find(({ id }) => id === index);
        return indexPattern && indexPattern.fields.byName[key];
      }

      function getOperatorFromFilter(filter) {
        const { type, negate } = filter.meta;
        return FILTER_OPERATORS.find((operator) => {
          return operator.type === type && operator.negate === negate;
        });
      }

      function getParamsFromFilter(filter) {
        const { type, key } = filter.meta;
        if (type === 'phrase') {
          const value = filter.query ? filter.query.match[key].query : filter.script.script.params.value;
          return { value };
        } else if (type === 'phrases') {
          return { values: filter.meta.values };
        } else if (type === 'range') {
          const params = filter.range ? filter.range[key] : filter.script.script.params;
          const from = _.has(params, 'gte') ? params.gte : params.gt;
          const to = _.has(params, 'lte') ? params.lte : params.lt;
          return { from, to };
        }
        return {};
      }

      function getFieldOptions(indexPatterns) {
        return indexPatterns.reduce((fields, indexPattern) => {
          const filterableFields = indexPattern.fields.filter(field => field.filterable);
          return [...fields, ...filterableFields];
        }, []);
      }

      function getOperatorOptions(field) {
        const type = _.get(field, 'type');
        return FILTER_OPERATORS.filter((operator) => {
          return !operator.fieldTypes || operator.fieldTypes.includes(type);
        });
      }

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
