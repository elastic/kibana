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

    self.errorCount = function (predicate) {
      return self.$$invalidModels().length;
    };

    // same as error count, but filters out untouched and pristine models
    self.softErrorCount = function () {
      return self.$$invalidModels(function (model) {
        return model.$touched || model.$dirty;
      }).length;
    };

    self.describeErrors = function () {
      var count = self.softErrorCount();
      return count + ' Error' + (count === 1 ? '' : 's');
    };

    self.$$invalidModels = function (predicate) {
      predicate = _.createCallback(predicate);

      var invalid = [];

      _.forOwn(self.$error, function collect(models) {
        if (!models) return;

        models.forEach(function (model) {
          if (model.$$invalidModels) {
            // recurse into child form
            _.forOwn(model.$error, collect);
          } else {
            if (predicate(model)) {
              // prevent dups
              var len = invalid.length;
              while (len--) if (invalid[len] === model) return;

              invalid.push(model);
            }
          }
        });
      });

      return invalid;
    };

    self.$setTouched = function () {
      self.$$invalidModels().forEach(function (model) {
        // only kbnModels have $setTouched
        if (model.$setTouched) model.$setTouched();
      });
    };

    function filterSubmits(event) {
      if (self.errorCount()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        self.$setTouched();
      }
    }

    $element.on('submit', filterSubmits);
    $scope.$on('$destroy', function () {
      $element.off('submit', filterSubmits);
    });
  }

  return KbnFormController;
});
