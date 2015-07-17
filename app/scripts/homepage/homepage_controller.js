define(function (require) {
    var _ = require('lodash');
    return function ($scope, $http, localStorageService) {

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

      $scope.input = {
        expressions: localStorageService.get('expressions') || blankSheet,
        selected: 0
      };

      $scope.setActiveCell = function (cell) {
        $scope.input.selected = cell;
      };

      $scope.search = function () {
        localStorageService.set('expressions', $scope.input.expressions);
        $scope.running = true;

        $http.post('/series', {sheet:$scope.input.expressions}).
          // data, status, headers, config
          success(function(sheet) {
            $scope.sheet = sheet;
            _.each(sheet, function (cell) {
              if (cell.exception) {
                $scope.input.selected = cell.plot;
              }
            });
            $scope.running = false;
          })
          .error(function () {
            $scope.sheet = [];
            $scope.running = false;
          });
      };

      init();
    };
});
