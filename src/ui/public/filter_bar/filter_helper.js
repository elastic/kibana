import _ from 'lodash';
import template from './filter_helper.html';
import uiModules from 'ui/modules';
import QueryFilterProvider from './query_filter';
import buildPhraseFilter from '../filter_manager/lib/phrase';
import buildRangeFilter from '../filter_manager/lib/range';
import buildExistsFilter from '../filter_manager/lib/exists';
import buildTermsFilter from '../filter_manager/lib/terms';

uiModules.get('kibana').directive('filterHelper', function (Private, es) {
  const queryFilter = Private(QueryFilterProvider);

  return {
    template,
    restrict: 'E',
    scope: {
      indexPattern: '=',
      onApply: '&'
    },
    controllerAs: 'filterHelper',
    controller: function ($scope) {
      this.indexPattern = $scope.indexPattern;
      this.types = [{
        id: 'query.match',
        label: 'matches'
      }, {
        id: 'query.terms',
        label: 'is one of'
      }, {
        id: 'range',
        label: 'is between'
      }, {
        id: 'exists',
        label: 'exists'
      }, {
        id: 'query.match',
        label: 'does not match',
        negate: true
      }, {
        id: 'query.terms',
        label: 'is not one of',
        negate: true
      }, {
        id: 'range',
        label: 'is not between',
        negate: true
      }, {
        id: 'exists',
        label: 'does not exist',
        negate: true
      }];

      this.helpers = getHelpersFromFilters(queryFilter.getFilters(), this.types);
      this.removedHelpers = [];
      this.suggestions = {};

      $scope.$listen(queryFilter, 'update', () => {
        this.helpers = getHelpersFromFilters(queryFilter.getFilters(), this.types);
      });

      this.filterTypesByField = (types, field) => {
        return types.filter(type => {
          return type.id !== 'range' || this.indexPattern.fields.byName[field].type === 'number';
        });
      };

      this.addHelper = () => {
        this.helpers = [...this.helpers, {
          type: this.types[0],
          field: this.indexPattern.fields[0].name,
          params: {
            query: '',
            type: 'phrase'
          }
        }];
      };

      this.removeHelper = (helper) => {
        this.helpers = _.without(this.helpers, helper);
        this.removedHelpers = [...this.removedHelpers, helper];
      };

      this.applyHelpers = () => {
        [...this.removedHelpers, ...this.helpers].forEach(helper => {
          if (helper.filter) queryFilter.removeFilter(helper.filter);
        });

        const filters = this.helpers.map(helper => getFilterFromHelper(helper, $scope.indexPattern));
        queryFilter.addFilters(filters);

        $scope.onApply();
      };

      this.refreshSuggestions = (field, value) => {
        const include = this.indexPattern.fields.byName[field].type === 'string' && value ? `.*${value}.*` : undefined;
        return es.search({
          index: this.indexPattern.id,
          body: {
            aggs: {
              suggestions: {
                terms: {
                  field,
                  include
                }
              }
            }
          },
        })
        .then(result => {
          const suggestions = result.aggregations.suggestions.buckets.map(bucket => bucket.key);
          if (value) suggestions.unshift(value);
          this.suggestions[field] = suggestions;
        });
      };
    }
  };
});

function getHelpersFromFilters(filters, types) {
  return filters.filter(filter => !filter.meta.disabled)
  .map(filter => getHelperFromFilter(filter, types))
  .filter(helper => helper !== null);
}

function getHelperFromFilter(filter, types) {
  const type = types.find(type => {
    return _.has(filter, type.id) && !!filter.meta.negate === !!type.negate;
  });
  if (!type) return null;

  let field;
  let params;
  if (type.id === 'query.match') {
    field = Object.keys(filter.query.match)[0];
    params = { ...filter.query.match[field] };
  } else if (type.id === 'query.terms') {
    field = Object.keys(filter.query.terms)[0];
    params = [...filter.query.terms[field]];
  } else if (type.id === 'range') {
    field = Object.keys(filter.range)[0];
    params = _.mapValues(filter.range[field], parseFloat);
  } else {
    field = filter.exists.field;
  }

  return { filter, type, field, params, negate: filter.meta.negate };
}

function getFilterFromHelper(helper, indexPattern) {
  const field = indexPattern.fields.byName[helper.field];
  if (helper.type.id === 'query.match') {
    return buildPhraseFilter(field, helper.params.query, indexPattern, helper.type.negate);
  } else if (helper.type.id === 'query.terms') {
    return buildTermsFilter(field.name, helper.params.terms, indexPattern, helper.type.negate);
  } else if (helper.type.id === 'range') {
    return buildRangeFilter(field, _.pick(helper.params, ['gte', 'lte', 'gt', 'lt']), indexPattern, null, helper.type.negate);
  } else {
    return buildExistsFilter(field.name, indexPattern, helper.type.negate);
  }
}
