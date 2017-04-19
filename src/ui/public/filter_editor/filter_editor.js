import uiModules from 'ui/modules';
import template from './filter_editor.html';
import { FILTER_OPERATORS } from './lib/filter_operators';
import { buildExistsFilter, buildPhraseFilter, buildRangeFilter, buildTermsFilter } from '../filter_manager/lib';

const module = uiModules.get('kibana');
module.directive('filterEditor', function (indexPatterns, es) {
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
    controller: function () {
      const { index, key } = this.filter.meta;
      this.indexPattern = indexPatterns.get(index)
      .then((indexPattern) => {
        this.setIndexPattern(indexPattern);
        if (!key) return;
        this.setField(indexPattern.fields.byName[key]);
        this.setOperator(getOperatorFromFilter(this.filter));
        this.params = getParamsFromFilter(this.filter);
      });

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
        if (operator.type === 'match' || operator.type === 'terms') {
          // TODO: Cache this and build up the array
          this.getValueSuggestions = (query) => {
            return getValueSuggestions(this.indexPattern, this.field, query)
            .then(suggestions => this.valueSuggestions = suggestions);
          };
        } // ...
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
        } // ...
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
        } // ...
      }

      function getOperatorSuggestions(indexPattern, field) {
        return FILTER_OPERATORS.filter((operator) => {
          return !operator.fieldTypes || operator.fieldTypes.includes(field.type);
        }); // ...
      }

      function getValueSuggestions(indexPattern, field, query) {
        const include = query && field.type === 'string' ? `.*${query}.*` : undefined;
        return es.search({
          index: indexPattern.id,
          body: {
            aggs: {
              suggestions: {
                terms: {
                  include,
                  field: field.name
                }
              }
            }
          }
        })
        .then(response => response.aggregations.suggestions.buckets.map(bucket => bucket.key));
      }
    }
  };
});
