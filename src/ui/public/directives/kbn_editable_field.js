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
    // require: 'ngModel',
    link: function ($scope, $element, attrs, ngModelController) {
      const fieldKey = attrs.kbnEditField;
      const $inputEl = $element.children('input');

      // Inspired by
      // https://github.com/angular/angular.js/blob/master/src/ng/directive/ngModel.js#L245
      const parsedModel = $parse(attrs.kbnEditField);
      const getVal = parsedModel;
      const setVal = parsedModel.assign;
      const initialValue = attrs.initialVal || getModelVal();
      $inputEl.on('keyup', evt => {
        const isEnterKey = evt.keyCode === 13;
        const isEscKey = evt.keyCode === 27;
        if (isEnterKey) {
          // This is much slower in setting than the click, not really sure why honestly
          safeSetModel();
        } else if (isEscKey) {
          setInput();
        }

        if (isEnterKey || isEscKey) {
          blurInput();
        }
        toggleEditClass();
      });
      // click on the check button
      $element.find('.fa-check').click(() => {
        safeSetModel();
        toggleEditClass();
        blurInput();
      });
      // Click on the undo button
      $element.find('.fa-undo').click(() => {
        safeSetModel(initialValue);
        setInput(initialValue);
        toggleEditClass();
      });
      // click on the x, button
      $element.find('.fa-remove').click(() => {
        setInput();
        toggleEditClass();
      });
      // On external change show the user
      $scope.$watch(fieldKey, function (newVal) { setInput(newVal); });


      function toggleEditClass() {
        $element.toggleClass('editing', getModelVal() !== $inputEl.val());
      }
      function safeSetModel(val = $inputEl.val()) {
        const safeVal = trimWhiteSpace(val);
        if (safeVal.length) {
          setModel(safeVal);
          if (safeVal !== val) { // If trimWhiteSpace had to, you know, trimWhiteSpace
            setInput(safeVal);
          }
        } else {
          setInput();
        }
      }
      function blurInput() {
        $inputEl.blur();
      }

      function getModelVal() { return getVal($scope); }
      // Sync the veiwVal, and what is.
      function setInput(val = getModelVal()) { $inputEl.val(val); }
      // Set the model value
      function setModel(val) { setVal($scope, val); }
    }
  };
}]);
