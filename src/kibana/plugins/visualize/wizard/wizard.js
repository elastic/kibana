define(function (require) {
  var _ = require('lodash');

  require('plugins/visualize/saved_visualizations/saved_visualizations');
  require('directives/saved_object_finder');
  require('plugins/discover/saved_searches/saved_searches');

  var templateStep = function (num, txt) {
    return '<div ng-controller="VisualizeWizardStep' + num + '" class="container vis-wizard">' + txt + '</div>';
  };

  var module = require('modules').get('app/visualize', ['kibana/courier']);
  var routes = require('routes');

  /********
  /** Wizard Step 1
  /********/
  routes.when('/visualize/step/1', {
    template: templateStep(1, require('text!plugins/visualize/wizard/step_1.html')),
    resolve: {
      indexPatternIds: function (courier) {
        return courier.indexPatterns.getIds();
      }
    }
  });

  module.controller('VisualizeWizardStep1', function ($route, $scope, $location, timefilter, kbnUrl) {
    $scope.step2WithSearchUrl = function (hit) {
      return kbnUrl.eval('#/visualize/step/2?savedSearchId={{id}}', {id: hit.id});
    };

    timefilter.enabled = false;

    $scope.indexPattern = {
      selection: null,
      list: $route.current.locals.indexPatternIds
    };

    $scope.$watch('stepOneMode', function (mode) {
      if (mode === 'new') {
        if ($scope.indexPattern.list && $scope.indexPattern.list.length === 1) {
          $scope.indexPattern.selection = $scope.indexPattern.list[0];
        }
      }
    });

    $scope.$watch('indexPattern.selection', function (pattern) {
      if (!pattern) return;
      kbnUrl.change('/visualize/step/2?indexPattern={{pattern}}', {pattern: pattern});
    });
  });

  /********
  /** Wizard Step 2
  /********/
  routes.when('/visualize/step/2', {
    template: templateStep(2, require('text!plugins/visualize/wizard/step_2.html'))
  });

  module.controller('VisualizeWizardStep2', function ($scope, $route, $location, timefilter, Private) {
    var existing = _.pick($route.current.params, 'indexPattern', 'savedSearchId');

    timefilter.enabled = false;

    $scope.visTypes = Private(require('registry/vis_types'));
    $scope.visTypeUrl = function (visType) {
      var query = _.defaults({
        type: visType.name
      }, existing);

      return '#/visualize/create?' + _.map(query, function (val, key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(val);
      }).join('&');
    };
  });
});