import $ from 'jquery';
import uiModules from 'ui/modules';

const module = uiModules.get('kibana');

// Take any value and add a can
module.directive('kbnEditField', ['$parse', function ($parse) {
  return {
    restrict: 'A',
    template: `<input type="text" />
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
        const isSetKey = evt.keyCode === 13;
        const isCancelKey = evt.keyCode === 27;
        if (isSetKey) {
          setModel();
        } else if (isCancelKey) {
          setInput();
        }
        return false;
      });
      $element.find('.fa-check').click(() => { setModel(); });
      $element.find('.fa-remove').click(() => { setInput(); });
      // On external change show the user
      $scope.$watch(fieldKey, function (newVal) { setInput(newVal); });

      // Sync the veiwVal, and what is.
      function setInput(val) { $inputEl.val(val || getVal($scope)); }
      // Set the model value
      function setModel(val) { setVal($scope, val || $inputEl.val()); }
    }
  };
}]);
