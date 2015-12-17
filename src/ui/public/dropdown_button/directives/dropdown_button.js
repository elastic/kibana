const app = require('ui/modules').get('kibana');

app.directive('dropdownButton', function ($document) {
  return {
    restrict: 'E',
    scope: {
      objectType: '@'
    },
    template: require('ui/dropdown_button/views/dropdown_button.html'),
    link: function ($scope, $el) {
      $scope.$wrapper = $el;
    },
    controller: function ($scope) {
      $scope.allowEmbed = $scope.setAllowEmbed ? $scope.setAllowEmbed() : true;

      $scope.dropdownVisible = false;
      $scope.toggle = function () {
        $scope.dropdownStyle = { top: `${$scope.$wrapper.height() + 2}px` };
        $scope.dropdownVisible = !$scope.dropdownVisible;
      };
    }
  };
});
