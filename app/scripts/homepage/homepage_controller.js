define(function (require) {
    var _ = require('lodash');
    return function ($scope, $http, localStorageService) {

      var init = function () {
        $scope.running = false;
        $scope.search();
      };

      var blankSheet = [
        ['`-*`', '`-*`', '`-*`'],
        ['`-*`', '`-*`', '`-*`'],
        ['`-*`', '`-*`', '`-*`']
      ];

      $scope.newSheet = function () {
        $scope.input.expressions = _.cloneDeep(blankSheet);
        init();
      };

      $scope.input = {
        expressions: localStorageService.get('expressions') || blankSheet,
        row: 0,
        column: 0
      };

      $scope.setActiveCell = function (row, column) {
        $scope.input.row = row;
        $scope.input.column = column;
      };

      $scope.getCellId = function (row, column) {
        return String.fromCharCode(column + 65) + (row + 1);
      };

      $scope.search = function () {
        localStorageService.set('expressions', $scope.input.expressions);
        $scope.running = true;

        $http.post('/series', {sheet:$scope.input.expressions}).
          // data, status, headers, config
          success(function(sheet) {
            $scope.sheet = sheet;
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
