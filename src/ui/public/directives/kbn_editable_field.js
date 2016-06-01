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
      returnVal = returnVal.substr(0, returnVal.length - 2);
    }
    return returnVal;
  }
  return {
    restrict: 'A',
    template: `<input type="text" class="form-control" />
          <span><i class="fa fa-check"></i></span>
          <span><i class="fa fa-remove"></i></span>`,
    // require: 'ngModel',
    link: function ($scope, $element, attrs, ngModelController) {
      const parsedModel = $parse(attrs.kbnEditField);
      const getVal = parsedModel;
      const setVal = parsedModel.assign;
      const fieldKey = attrs.kbnEditField;
      const $inputEl = $element.children('input');
      // This is much slower in setting than the click, not really sure why honestly
      $inputEl.on('keyup', evt => {
        const isEnterKey = evt.keyCode === 13;
        const isEscKey = evt.keyCode === 27;
        if (isEnterKey) {
          safeSetModel();
        } else if (isEscKey) {
          setInput();
        } else {
          return;
        }
        blurInput();
      });
      $element.find('.fa-check').click(() => {
        safeSetModel();
        blurInput();
      });
      $element.find('.fa-remove').click(() => { setInput(); });
      // On external change show the user
      $scope.$watch(fieldKey, function (newVal) { setInput(newVal); });


      function safeSetModel(val = $inputEl.val()) {
        const safeVal = trimWhiteSpace(val);
        if (safeVal.length) {
          setModel(safeVal);
        } else {
          setInput();
        }
      }
      function blurInput() {
        $inputEl.blur();
      }

      // Sync the veiwVal, and what is.
      function setInput(val = getVal($scope)) { $inputEl.val(val); }
      // Set the model value
      function setModel(val) { setVal($scope, val); }
    }
  };
}]);
