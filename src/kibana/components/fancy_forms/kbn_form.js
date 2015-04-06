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
    self.$blockedSubmits = 0;

    self.errorCount = function () {
      return _.reduce(self.$error, function (count, models, errorType) {
        if (!models) return count;
        return count + _.size(models);
      }, 0);
    };

    self.describeErrors = function () {
      var count = self.errorCount();
      return count + ' Error' + (count === 1 ? '' : 's');
    };

    self.$invalidModels = function () {
      return _.reduce(self.$error, function (all, models) {
        return all.concat(models ? models : []);
      }, []);
    };

    self.$setTouched = function () {
      self.$invalidModels().forEach(function (model) {
        // only kbnModels and kbnForms have $setTouched
        if (model.$setTouched) model.$setTouched();
      });
    };

    function filterSubmits(event) {
      if (self.errorCount()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        self.$blockedSubmits += 1;
        self.$setTouched();
      } else {
        self.$blockedSubmits = 0;
      }
    }

    $element.on('submit', filterSubmits);
    $scope.$on('$destroy', function () {
      $element.off('submit', filterSubmits);
    });
  }

  return KbnFormController;
});
