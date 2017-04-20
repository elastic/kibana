import _ from 'lodash';
import uiModules from 'ui/modules';
import template from './filter_editor.html';
import { FILTER_OPERATORS } from './lib/filter_operators';
import { buildExistsFilter, buildPhraseFilter, buildRangeFilter, buildTermsFilter } from '../filter_manager/lib';

const module = uiModules.get('kibana');
module.directive('filterEditor', function (indexPatterns, $http) {
  return {
    restrict: 'E',
    template,
    scope: {
      filter: '=',
      onCancel: '&',
      onSave: '&'
    },
    controllerAs: 'filterEditor',
    bindToController: true,
    controller: function ($scope) {
      this.init = (filter) => {
        const { index, key } = filter.meta;
        this.indexPattern = indexPatterns.get(index)
        .then((indexPattern) => {
          this.setIndexPattern(indexPattern);
          this.setField(indexPattern.fields.byName[key]);
          this.setOperator(getOperatorFromFilter(filter));
          this.params = getParamsFromFilter(filter);
        });
      };

      $scope.$watch(() => this.filter, this.init);

      this.setIndexPattern = (indexPattern) => {
        this.indexPattern = indexPattern;
        this.field = null;
        this.fieldSuggestions = indexPattern.fields;
      };

      this.getSetField = (field) => {
        if (field) return this.setField(field);
        else return this.field;
      };

      this.setField = (field) => {
        this.field = field;
        this.operator = null;
        this.operatorSuggestions = getOperatorSuggestions(this.indexPattern, field);
      };

      this.getSetOperator = (operator) => {
        if (operator) return this.setOperator(operator);
        return this.operator;
      };

      this.setOperator = (operator) => {
        this.operator = operator;
        const type = _.get(operator, 'type');
        if (type === 'match' || type === 'terms') {
          this.refreshValueSuggestions();
        }
      };

      this.refreshValueSuggestions = (query) => {
        return getValueSuggestions(this.indexPattern, this.field, query)
        .then(suggestions => this.valueSuggestions = suggestions);
      };

      this.save = () => {
        const { indexPattern, field, operator, params } = this;

        let filter;
        if (operator.type === 'match') {
          filter = buildPhraseFilter(field, params.value, indexPattern);
        } else if (operator.type === 'terms') {
          filter = buildTermsFilter(field, params.values, indexPattern);
        } else if (operator.type === 'range') {
          filter = buildRangeFilter(field, { gte: params.from, lt: params.to }, indexPattern);
        } else if (operator.type === 'exists') {
          filter = buildExistsFilter(field, indexPattern);
        }

        filter.meta.negate = operator.negate;
        return this.onSave({ filter });
      };

      function getOperatorFromFilter(filter) {
        const { type, negate } = filter.meta;
        return FILTER_OPERATORS.find(operator => {
          return operator.type === type && operator.negate === negate;
        });
      }

      function getParamsFromFilter(filter) {
        const { type, key } = filter.meta;
        if (type === 'match') {
          return { value: filter.query.match[key].query };
        } else if (type === 'terms') {
          return { values: filter.query.terms[key] };
        } else if (type === 'range') {
          const params = filter.range[key];
          return {
            from: params.gte || params.gt,
            to: params.lte || params.lt
          };
        }
      }

      function getOperatorSuggestions(indexPattern, field) {
        const type = _.get(field, 'type');
        return FILTER_OPERATORS.filter((operator) => {
          return !operator.fieldTypes || operator.fieldTypes.includes(type);
        });
      }

      function getValueSuggestions(indexPattern, field, query) {
        if (!_.get(field, 'aggregatable')) return Promise.resolve([]);
        return $http.post(`../api/kibana/suggestions/values/${indexPattern.id}`, {
          query,
          field: field.name
        })
        .then(response => response.data);
      }
    }
  };
});
