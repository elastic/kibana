import $ from 'jquery';
import uiModules from 'ui/modules';

const module = uiModules.get('kibana');

// Take any value and add a can
module.directive('kbnEditField', ['$parse', function ($parse) {
  function trimWhiteSpace(str) {
    let returnVal = str;
    while (returnVal[0] === ' ') {
      returnVal = returnVal.substr(1);
    }
    while (returnVal[returnVal.length - 1] === ' ') {
      returnVal = returnVal.substr(0, returnVal.length - 1);
    }
    return returnVal;
  }
  return {
    restrict: 'A',
    template: `<input type="text" class="form-control" />
          <span><i class="fa fa-check"></i></span>
          <span><i class="fa fa-remove"></i></span>
          <span><i class="fa fa-undo"></i></span>`,
    controller: function ($scope, $element, $attrs) {
      const fieldKey = $attrs.kbnEditField;
      // On external change show the user
      $scope.$watch(fieldKey, function (newVal) { setInput(newVal); });

      const $inputEl = $element.children('input');
      // Inspired by
      // https://github.com/angular/angular.js/blob/master/src/ng/directive/ngModel.js#L245
      const parsedModel = $parse(fieldKey);
      const getVal = parsedModel;
      const setVal = parsedModel.assign;

      // Get the val
      function getModelVal() { return getVal($scope); }
      // Sync the veiwVal, and what is.
      function setInput(val) { $inputEl.val(val); }
      // Set the model value
      function setModel(val) { setVal($scope, val); }

      this.model = function (val) {
        const retVal = getModelVal();
        if (val) { setModel(val); }
        return retVal;
      };
      this.input = function (val) {
        const retVal = $inputEl.val();
        if (val) { setInput(val); }
        return retVal;
      };
      this.blurInput = function () { $inputEl.blur(); };
      this.toggleEditClass = function () { $element.toggleClass('editing', getModelVal() !== $inputEl.val()); };
      const initialValue = $attrs.initialVal || getModelVal();
      this.getInitialVal = function () { return initialValue; };
    },
    link: function ($scope, $element, attrs, kbnEditFieldCtrl) {
      // Add necessary classesto the markup
      $element.addClass('kbn-edit-field');
      const $inputEl = $element.children('input');
      const ctrl = kbnEditFieldCtrl;

      $inputEl.on('keyup', evt => {
        const isEnterKey = evt.keyCode === 13;
        const isEscKey = evt.keyCode === 27;
        if (isEnterKey) {
          // This is much slower in setting than the click, not really sure why honestly
          safeSetModel();
        } else if (isEscKey) { // reset the input
          ctrl.input(ctrl.model());
        }

        if (isEnterKey || isEscKey) {
          ctrl.blurInput();
        }
        ctrl.toggleEditClass();
      });
      // click on the check button
      $element.find('.fa-check').click(() => {
        safeSetModel();
        ctrl.toggleEditClass();
        ctrl.blurInput();
      });

      // Click on the undo button
      $element.find('.fa-undo').click(() => {
        safeSetModel(ctrl.getInitialVal());
        ctrl.input(ctrl.getInitialVal());
        ctrl.toggleEditClass();
      });

      // click on the x, button; same as ESC
      $element.find('.fa-remove').click(() => {
        ctrl.input(ctrl.model());
        ctrl.toggleEditClass();
      });

      function safeSetModel(val = ctrl.input()) {
        const safeVal = trimWhiteSpace(val);
        if (safeVal.length) {
          ctrl.model(safeVal);
          if (safeVal !== val) { // If trimWhiteSpace had to, you know, trimWhiteSpace
            ctrl.input(safeVal);
          }
        } else {
          ctrl.input(ctrl.model());
        }
      }

    }
  };
}]);
