define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  var PRISTINE_CLASS = 'ng-pristine';
  var DIRTY_CLASS = 'ng-dirty';
  var UNTOUCHED_CLASS = 'ng-untouched';
  var TOUCHED_CLASS = 'ng-touched';

  // http://goo.gl/eJofve
  var nullFormCtrl = {
    $addControl: _.noop,
    $removeControl: _.noop,
    $setValidity: _.noop,
    $setDirty: _.noop,
    $setPristine: _.noop
  };

  /**
   * Extension of Angular's NgModelController class
   * that ensures models are marked "dirty" after
   * they move from an invalid state to valid.
   *
   * @param {$scope} $scope
   */
  function KbnModelController($scope, $element, $animate) {
    var ngModel = this;

    // verify that angular works the way we are assuming it does
    if (angular.version.full !== '1.2.28') {
      throw new Error('angular version has updated but KbnModelController has not!');
    }

    /**
     * Get the form a model belongs to
     *
     * @return {NgFormController} - the parent controller of a noop controller
     */
    ngModel.$getForm = function () {
      return $element.inheritedData('$formController') || nullFormCtrl;
    };

    /**
     * Update the ngModel to be "dirty" if it is pristine.
     *
     * @return {undefined}
     */
    ngModel.$setDirty = function () {
      ngModel.$setTouched();
      $$setDirty();
    };

    function $$setDirty() {
      if (ngModel.$dirty) return;

      ngModel.$dirty = true;
      ngModel.$pristine = false;
      $animate.removeClass($element, PRISTINE_CLASS);
      $animate.addClass($element, DIRTY_CLASS);
      ngModel.$getForm().$setDirty();
    }

    ngModel.$setTouched = toggleTouched(true);
    ngModel.$setUntouched = toggleTouched(false);
    function toggleTouched(val) {
      return function () {
        if (ngModel.$touched === val) return;

        ngModel.$touched = val;
        ngModel.$untouched = !val;
        $animate.addClass($element, val ? TOUCHED_CLASS : UNTOUCHED_CLASS);
        $animate.removeClass($element, val ? UNTOUCHED_CLASS : TOUCHED_CLASS);
      };
    }

    /**
     * While the model is pristine, ensure that the model
     * gets set to dirty if it becomes invalid. If the model
     * becomes dirty of other reasons stop watching and
     * waitForPristine()
     *
     * @return {undefined}
     */
    function watchForDirtyOrInvalid() {
      var unwatch = $scope.$watch(get, react);

      function get() {
        return ngModel.$dirty || ngModel.$invalid;
      }

      function react(is, was) {
        if (is === was) return;
        unwatch();
        waitForPristine();
        $$setDirty();
      }
    }

    /**
     * Once a model becomes dirty, there is no longer a need
     * for a watcher. Instead, we will react to the $setPristine
     * method being called. This is the only way for a model to go
     * from dirty -> pristine.
     *
     * @return {[type]} [description]
     */
    function waitForPristine() {
      var fn = ngModel.$setPristine;
      ngModel.$setPristine = function () {
        var ret = fn.apply(this, arguments);
        if (ngModel.$pristine) {
          ngModel.$setPristine = fn;
          watchForDirtyOrInvalid();
        }
        return ret;
      };
    }

    ngModel.$setUntouched();
    $element.one('blur', function () {
      ngModel.$setTouched();
      $scope.$apply();
    });
    $scope.$on('$destroy', function () {
      $element.off('blur', ngModel.$setTouched);
    });

    // wait for child scope to init before watching validity
    $scope.$evalAsync(function () {
      if (ngModel.$dirty) waitForPristine();
      else watchForDirtyOrInvalid();
    });
  }

  return KbnModelController;
});
