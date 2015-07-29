define(function (require) {
    var _ = require('lodash');
    return function ($scope, $http, localStorageService) {

      $scope.input = {
        expressions: localStorageService.get('expressions') || blankSheet,
        selected: 0,
        interval: '1w'
      };

      var init = function () {
        $scope.running = false;
        $scope.search();
      };

      var blankSheet = ['(`-*`)', '(`-*`)', '(`-*`)'];

      $scope.newSheet = function () {
        $scope.input.expressions = _.cloneDeep(blankSheet);
        init();
      };

      $scope.newCell = function () {
        $scope.input.expressions.push('(`-*`)');
        $scope.search();
      };

      $scope.removeCell = function (index) {
        _.pullAt($scope.input.expressions, index);
        $scope.search();
      };

      $scope.setActiveCell = function (cell) {
        $scope.input.selected = cell;
      };

      $scope.search = function () {
        localStorageService.set('expressions', $scope.input.expressions);
        $scope.running = true;

        $http.post('/series', {sheet:$scope.input.expressions, interval: $scope.input.interval}).
          // data, status, headers, config
          success(function(resp) {
            $scope.error = null;
            $scope.stats = resp.stats;
            $scope.sheet = resp.sheet;
            _.each(resp.sheet, function (cell) {
              if (cell.exception) {
                $scope.input.selected = cell.plot;
              }
            });
            $scope.running = false;
          })
          .error(function (resp) {
            $scope.error = resp.error;
            $scope.sheet = [];
            $scope.running = false;
          });
      };

      init();
    };
});
