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
      return _.reduce(self.$error, function (count, models, errorType) {
        if (!models) return count;
        return count + _.size(models);
      }, 0);
    };

    self.describeErrors = function () {
      var count = self.errorCount();
      return count + ' Error' + (count === 1 ? '' : 's');
    };

    self.invalidModels = function () {
      return _.reduce(self.$error, function (all, models) {
        return all.concat(models ? models : []);
      }, []);
    };

    function filterSubmits(event) {
      if (self.errorCount()) {
        event.stopImmediatePropagation();
        self.invalidModels().forEach(function (model) {
          if (model.$setDirty) { // only kbnModels have $setDirty
            model.$setDirty();
          }
        });
      }
    }

    $element.on('submit', filterSubmits);
    $scope.$on('$destroy', function () {
      $element.off('submit', filterSubmits);
    });
  }

  return KbnFormController;
});