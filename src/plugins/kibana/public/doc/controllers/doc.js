define(function (require) {
  const _ = require('lodash');
  const angular = require('angular');

  require('ui/notify');
  require('ui/courier');
  require('ui/doc_viewer');
  require('ui/index_patterns');

  const app = require('ui/modules').get('apps/doc', [
    'kibana/notify',
    'kibana/courier',
    'kibana/index_patterns'
  ]);

  const html = require('plugins/kibana/doc/index.html');

  const resolveIndexPattern = {
    indexPattern: function (courier, savedSearches, $route) {
      return courier.indexPatterns.get($route.current.params.indexPattern);
    }
  };

  require('ui/routes')
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
        fields: computedFields.fields,
        script_fields: computedFields.scriptFields,
        fielddata_fields: computedFields.fielddataFields
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
});
