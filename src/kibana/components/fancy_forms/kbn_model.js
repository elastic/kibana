define(function (require) {
  var _ = require('lodash');
  var SVV_CHECKSUM = require('text!components/fancy_forms/_set_view_value.checksum');
  var PRISTINE_CLASS = 'ng-pristine';
  var DIRTY_CLASS = 'ng-dirty';

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
    if (String(ngModel.$setViewValue).replace(/\s+/g, '') !== SVV_CHECKSUM) {
      throw new Error('ngModelController.$setViewValue has updated but KbnModelController has not!');
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
      if (ngModel.$dirty) return;
      ngModel.$dirty = true;
      ngModel.$pristine = false;
      $animate.removeClass($element, PRISTINE_CLASS);
      $animate.addClass($element, DIRTY_CLASS);
      ngModel.$getForm().$setDirty();
    };

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
        ngModel.$setDirty();
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

    if (ngModel.$dirty) waitForPristine();
    else watchForDirtyOrInvalid();
  }

  return KbnModelController;
});