import { uiModules } from 'ui/modules';
import { TermsVis } from './components/terms_vis';
import { FetchProvider } from 'ui/courier/fetch/fetch';
import { SearchSourceProvider } from 'ui/courier/data_source/search_source';

const module = uiModules.get('kibana/terms_vis', ['kibana', 'react']);
module.controller('KbnTermsController', function ($scope, indexPatterns, Private, Promise) {
  const fetch = Private(FetchProvider);
  const SearchSource = Private(SearchSourceProvider);

  $scope.reactProps = {
    visParams: $scope.vis.params
  };

  $scope.$watch('vis.params', function (visParams, oldParams) {
    if (visParams === oldParams) {
      return;
    }

    $scope.reactProps.visParams = visParams;

    const createRequestPromises = $scope.vis.params.fields.map(async (field) => {
      const indexPattern = await indexPatterns.get(field.indexPattern);
      const searchSource = new SearchSource();
      searchSource.inherits(false); //Do not filter by time so can not inherit from rootSearchSource
      searchSource.size(0);
      searchSource.index(indexPattern);

      const defer = Promise.defer();
      defer.promise.then(function (resp) {
        console.log('resp', resp);
      });

      return searchSource._createRequest(defer);
    });
    Promise.all(createRequestPromises).then(requests => {
      fetch.these(requests);
    });
  });
});

module.value('TermsVis', TermsVis);
