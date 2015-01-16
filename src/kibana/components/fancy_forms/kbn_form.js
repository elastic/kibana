define(function (require) {
  var _ = require('lodash');

  /**
   * Extension of Angular's FormController class
   * that provides helpers for error handling/validation.
   *
   * @param {$scope} $scope
   */
  function KbnFormController($scope, $element) {
    var self = this;

    self.errorCount = function () {
      return _.reduce(self.$error, function (count, controls, errorType) {
        return count + _.size(controls);
      }, 0);
    };

    self.describeErrors = function () {
      var count = self.errorCount();
      return count + ' Error' + (count > 1 ? 's' : '');
    };
  }

  return KbnFormController;
});