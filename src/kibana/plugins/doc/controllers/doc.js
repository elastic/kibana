define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');

  require('components/notify/notify');
  require('components/courier/courier');
  require('components/doc_viewer/doc_viewer');
  require('components/index_patterns/index_patterns');

  var app = require('modules').get('apps/doc', [
    'kibana/notify',
    'kibana/courier',
    'kibana/index_patterns'
  ]);

  require('routes')
  .when('/doc/:indexPattern/:index/:type/:id', {
    template: require('text!plugins/doc/index.html'),
    resolve: {
      indexPattern: function (courier, savedSearches, $route) {
        return courier.indexPatterns.get($route.current.params.indexPattern);
      }
    }
  });

  app.controller('doc', function ($scope, $route, es, timefilter) {

    timefilter.enabled = false;

    // Pretty much only need this for formatting, not actually using it for fetching anything.
    $scope.indexPattern = $route.current.locals.indexPattern;

    var computedFields = $scope.indexPattern.getComputedFields();

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
