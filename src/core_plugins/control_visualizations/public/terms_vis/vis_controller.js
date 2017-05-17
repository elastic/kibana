import _ from 'lodash';
import { uiModules } from 'ui/modules';
import { TermsVis } from './components/terms_vis';
import { FetchProvider } from 'ui/courier/fetch/fetch';
import { SearchSourceProvider } from 'ui/courier/data_source/search_source';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import { buildPhraseFilter } from 'ui/filter_manager/lib/phrase';

const module = uiModules.get('kibana/terms_vis', ['kibana', 'react']);
module.controller('KbnTermsController', function ($scope, indexPatterns, Private, Promise) {
  const fetch = Private(FetchProvider);
  const queryFilter = Private(FilterBarQueryFilterProvider);
  const SearchSource = Private(SearchSourceProvider);

  const termsAgg = (field, size, direction) => {
    const terms = {
      'size': size,
      'order': {
        '_count': direction
      }
    };
    if (field.scripted) {
      terms.script = {
        inline: field.script,
        lang: field.lang
      };
      terms.valueType = field.type === 'number' ? 'float' : field.type;
    } else {
      terms.field = field.name;
    }
    return {
      'termsAgg': {
        'terms': terms
      }
    };
  };

  const findFilter = (indexPatternId, fieldName) => {
    return _.flatten([queryFilter.getAppFilters(), queryFilter.getGlobalFilters()]).filter(function (filter) {
      if (_.has(filter, 'script') && _.get(filter, 'meta.index') === indexPatternId && _.get(filter, 'meta.field') === fieldName) {
        //filter is a scripted filter for this index/field
        return true;
      } else if (_.has(filter, ['query', 'match', fieldName]) && _.get(filter, 'meta.index') === indexPatternId) {
        //filter is a match filter for this index/field
        return true;
      }
      return false;
    });
  };

  const getSelected = (indexPatternId, fieldName) => {
    const filters = findFilter(indexPatternId, fieldName);
    if (filters.length === 0) {
      return '';
    } else {
      if (_.has(filters[0], 'script')) {
        return _.get(filters[0], 'script.script.params.value');
      }
      return _.get(filters[0], ['query', 'match', fieldName, 'query']);
    }
  };

  $scope.reactProps = {
    controls: [],
    setFilter: (field, value, indexPattern) => {
      const newFilter = buildPhraseFilter(field, value, indexPattern);
      const filters = findFilter(indexPattern.id, field.name);
      if (filters.length === 0) {
        queryFilter.addFilters(newFilter);
      } else {
        const model = {};
        if (field.scripted) {
          model.script = newFilter.script;
        } else {
          model.query = newFilter.query;
        }
        queryFilter.updateFilter({
          model: model,
          source: filters[0]
        });
      }
    },
    removeFilter: (field, indexPattern) => {
      const filters = findFilter(indexPattern.id, field.name);
      filters.forEach((filter) => {
        queryFilter.removeFilter(filter);
      });
    }
  };

  $scope.$watch('vis.params', function (visParams) {
    $scope.reactProps.controls = [];

    const createRequestPromises = visParams.fields.map(async (field) => {
      const indexPattern = await indexPatterns.get(field.indexPattern);
      const searchSource = new SearchSource();
      searchSource.inherits(false); //Do not filter by time so can not inherit from rootSearchSource
      searchSource.size(0);
      searchSource.index(indexPattern);
      searchSource.aggs(termsAgg(indexPattern.fields.byName[field.fieldName], 5, 'desc'));

      const defer = Promise.defer();
      defer.promise.then(function (resp) {
        const terms = _.get(resp, 'aggregations.termsAgg.buckets', []).map((bucket) => {
          return { label: bucket.key, value: bucket.key };
        });
        $scope.reactProps.controls.push({
          selected: getSelected(indexPattern.id, field.fieldName),
          indexPattern: indexPattern,
          field: indexPattern.fields.byName[field.fieldName],
          label: field.label ? field.label : field.fieldName,
          terms: terms
        });
      });
      return searchSource._createRequest(defer);
    });
    Promise.all(createRequestPromises).then(requests => {
      fetch.these(requests);
    });
  });

  queryFilter.on('update', function () {
    $scope.reactProps.controls = $scope.reactProps.controls.map((control) => {
      control.selected = getSelected(control.indexPattern.id, control.field.name);
      return control;
    });
  });
});

module.value('TermsVis', TermsVis);
