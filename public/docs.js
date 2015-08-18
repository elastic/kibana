define(function (require) {
  var html = require('./partials/docs/tutorial.html');
  var app = require('ui/modules').get('apps/timelion', []);
  var _ = require('lodash');
  var moment = require('moment');

  app.directive('timelionDocs', function (config, $http) {
    return {
      restrict: 'E',
      template: html,
      controller: function ($scope, config) {
        $scope.section = 'reference';
        $scope.showHelp = false;
        $scope.page = 1;

        if (config.get('timelion:showTutorial', true)) {
          $scope.section = 'tutorial';
          $scope.showHelp = true;
        }

        function init() {
          $scope.es = {
            invalidCount: 0
          };
          getFunctions();
          checkElasticsearch();
        };

        function getFunctions() {
          return $http.get('/timelion/functions').then(function (resp) {
            $scope.functionList = resp.data;
          });
        }

        $scope.disableTutorial = function () {
          config.set('timelion:showTutorial', false);
          $scope.showHelp = false;
          $scope.section = 'reference';
        };

        $scope.recheckElasticsearch = function () {
          $scope.es.valid = null;
          checkElasticsearch().then(function (valid) {
            if (!valid) $scope.es.invalidCount++;
          });
        };

        function checkElasticsearch() {
          return $http.get('/timelion/validate/es').then(function (resp) {
            if (resp.data.ok) {

              $scope.es.valid = true;
              $scope.es.stats = {
                min: moment(resp.data.min).format('LLL'),
                max: moment(resp.data.max).format('LLL'),
                field: resp.data.field
              };
            } else {
              $scope.es.valid = false;
            }
            return $scope.es.valid;
          });
        };
        init();
      }
    };
  });

});
