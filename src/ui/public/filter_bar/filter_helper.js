import _ from 'lodash';
import template from './filter_helper.html';
import uiModules from 'ui/modules';
import QueryFilterProvider from './query_filter';
import buildPhraseFilter from '../filter_manager/lib/phrase';
import buildRangeFilter from '../filter_manager/lib/range';

uiModules.get('kibana').directive('filterHelper', function (Private) {
  const queryFilter = Private(QueryFilterProvider);

  return {
    template,
    restrict: 'E',
    scope: {
      indexPattern: '='
    },
    controllerAs: 'filterHelper',
    controller: function ($scope) {
      this.indexPattern = $scope.indexPattern;
      this.types = [{
        id: 'query.match',
        label: 'matches'
      }, {
        id: 'range',
        label: 'between'
      }, {
        id: 'exists',
        label: 'exists'
      }];

      this.helpers = queryFilter.getFilters()
      .filter(filter => !filter.meta.disabled)
      .map(filter => getHelperFromFilter(filter, this.types))
      .filter(helper => helper !== null);

      this.removedHelpers = [];

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

        const filters = this.helpers.map(helper => {
          return getFilterFromHelper(helper, $scope.indexPattern);
        });
        queryFilter.addFilters(filters);
      };
    }
  };
});

function getHelperFromFilter(filter, types) {
  const type = types.find(type => {
    return _.has(filter, type.id);
  });

  if (!type) return null;

  if (type.id === 'exists') {
    return {
      filter,
      type,
      field: filter.exists.field,
      negate: filter.meta.negate
    };
  }

  const query = _.get(filter, type.id);
  const field = Object.keys(query)[0];
  return {
    filter,
    type,
    field,
    params: _.cloneDeep(query[field]),
    negate: filter.meta.negate
  };
}

function getFilterFromHelper(helper, indexPattern) {
  const field = indexPattern.fields.byName[helper.field];
  if (helper.type.id === 'query.match') {
    return buildPhraseFilter(field, helper.params.query, indexPattern);
  } else if (helper.type.id === 'range') {
    return buildRangeFilter(field, {
      gte: helper.params.gte,
      lt:  helper.params.lt
    }, indexPattern);
  } else {
    return buildExistsFilter(field.name, indexPattern);
  }
}

function buildExistsFilter(field, indexPattern) {
  return {
    exists: { field },
    meta: {
      index: indexPattern.id,
      key: 'exists',
      value: field
    }
  };
}
