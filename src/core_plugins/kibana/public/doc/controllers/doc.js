import 'ui/notify';
import 'ui/courier';
import 'ui/doc_viewer';
import 'ui/index_patterns';
import html from 'plugins/kibana/doc/index.html';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';


const app = uiModules.get('apps/doc', [
  'kibana/notify',
  'kibana/courier',
  'kibana/index_patterns'
]);


const resolveIndexPattern = {
  indexPattern: function (courier, savedSearches, $route) {
    return courier.indexPatterns.get($route.current.params.indexPattern);
  }
};

uiRoutes
.when('/doc/:indexPattern/:index/:type/:id', {
  template: html,
  resolve: resolveIndexPattern
})
.when('/doc/:indexPattern/:index/:type', {
  template: html,
  resolve: resolveIndexPattern
});

app.controller('doc', function ($scope, $route, es, timefilter) {

  timefilter.enabled = false;

  // Pretty much only need this for formatting, not actually using it for fetching anything.
  $scope.indexPattern = $route.current.locals.indexPattern;

  const computedFields = $scope.indexPattern.getComputedFields();

  es.search({
    index: $route.current.params.index,
    body: {
      query: {
        ids: {
          type: $route.current.params.type,
          values: [$route.current.params.id]
        }
      },
      stored_fields: computedFields.storedFields,
      _source: true,
      script_fields: computedFields.scriptFields,
      docvalue_fields: computedFields.docvalueFields
    }
  }).then(function (resp) {
    if (resp.hits) {
      if (resp.hits.total < 1) {
        $scope.status = 'notFound';
      } else {
        $scope.status = 'found';
        $scope.hit = resp.hits.hits[0];
      }
    }
  }).catch(function (err) {
    if (err.status === 404) {
      $scope.status = 'notFound';
    } else {
      $scope.status = 'error';
      $scope.resp = err;
    }
  });

});
