import uiModules from 'ui/modules';

const module = uiModules.get('kibana');

module.directive('validateJson', function () {
  return {
    restrict: 'A',
    require: 'ngModel',
    scope: {
      'ngModel': '=',
      'queryInput': '=?',
    },
    link: function ($scope, $elem, attr, ngModel) {
      $scope.$watch('ngModel', validator);

      function validator(newValue) {
        if (!newValue || newValue.length === 0) {
          setValid();
          return;
        }

        // We actually need a proper object in all JSON inputs
        newValue = (newValue || '').trim();
        if (newValue[0] === '{' || '[') {
          try {
            JSON.parse(newValue);
            setValid();
          } catch (e) {
            setInvalid();
          }
        } else {
          setInvalid();
        }
      }

      function setValid() {
        ngModel.$setValidity('jsonInput', true);
      }

      function setInvalid() {
        ngModel.$setValidity('jsonInput', false);
      }
    }
  };
});
