define(function (require) {
  var _ = require('lodash');
  var typeDefs = require('../saved_visualizations/_type_defs');

  require('../saved_visualizations/saved_visualizations');
  require('saved_object/finder.directive');
  require('apps/discover/saved_searches/saved_searches');

  var app = require('modules').get('app/visualize', [
    'kibana/courier'
  ]);

  var routes = require('routes');

  var templateStep = function (num, txt) {
    return '<div ng-controller="VisualizeWizardStep' + num + '" class="container vis-wizard">' + txt + '</div>';
  };

  /********
  /** Wizard Step 1
  /********/
  routes.when('/visualize/step/1', {
    template: templateStep(1, require('text!../partials/wizard/step_1.html')),
    resolve: {
      indexPatternIds: function (indexPatterns) {
        return indexPatterns.getIds();
      }
    }
  });

  app.controller('VisualizeWizardStep1', function ($route, $scope, courier, config, $location, indexPatterns, timefilter) {
    $scope.step2WithSearchUrl = function (hit) {
      return '#/visualize/step/2?savedSearchId=' + encodeURIComponent(hit.id);
    };

    timefilter.enabled(false);

    $scope.indexPattern = {
      selection: null,
      list: $route.current.locals.indexPatternIds
    };

    $scope.$watch('indexPattern.selection', function (pattern) {
      if (!pattern) return;
      $location.url('/visualize/step/2?indexPattern=' + encodeURIComponent(pattern));
    });
  });

  /********
  /** Wizard Step 2
  /********/
  routes.when('/visualize/step/2', {
    template: templateStep(2, require('text!../partials/wizard/step_2.html'))
  });

  app.controller('VisualizeWizardStep2', function ($scope, $route, $location, timefilter) {
    var existing = _.pick($route.current.params, 'indexPattern', 'savedSearchId');

    timefilter.enabled(false);

    $scope.visTypeDefs = typeDefs;
    $scope.typeUrl = function (type) {
      var query = _.defaults({
        type: type.name
      }, existing);

      return '#/visualize/create?' + _.map(query, function (val, key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(val);
      }).join('&');
    };
  });
});