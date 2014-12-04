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

  app.controller('doc', function ($scope, courier, $route, Notifier, es) {

    // Pretty much only need this for formatting, not actually using it for fetching anything.
    $scope.indexPattern = $route.current.locals.indexPattern;

    var notify = new Notifier({
      location: 'Doc'
    });

    var computedFields = $scope.indexPattern.getComputedFields();

    // Q: Hey jerk, why are you using this instead of just getting a document?
    // A: No need for name calling. This is the only way we can get the scripted & stored fields.
    // Q: Then why not use a searchSource?
    // A: I only need the one index, constructing a temporary index pattern seems wasteful.
    es.search({
      index: $route.current.params.index,
      type: $route.current.params.type,
      body: {
        query: {
          ids: {
            values: [$route.current.params.id]
          }
        },
        fields: computedFields.fields,
        script_fields: computedFields.scriptFields
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
      $scope.status = 'error';
      $scope.resp = err;
    });

  });
});
