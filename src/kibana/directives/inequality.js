define(function (require) {
  var _ = require('lodash');
  var inequalityMaps = {};

  function attachInequality() {
    return function ($scope, $el, $attr, controllers) {
      var ngModel = controllers[0];
      var ngForm = controllers[1];
      var name = $attr.inequality.slice(1);

      inequalityMaps[$attr.name] = name;
      ngModel.$parsers.push(validator);
      ngModel.$formatters.push(validator);

      function validator(thisVal) {
        var sign = $attr.inequality.slice(0, 1);
        var valid = false;
        var otherElem = ngForm[name];
        var otherVal = +otherElem.$modelValue || 0;
        var hasCompliment = (inequalityMaps[name] === $attr.name);

        if (!isNaN(thisVal)) {
          switch (sign) {
            case ('<'):
              valid = +thisVal < otherVal;
              break;
            case ('>'):
              valid = +thisVal > otherVal;
              break;
          }
        }

        ngModel.$setValidity('inequality', valid);
        if (hasCompliment) {
          otherElem.$setValidity('inequality', valid);
        }

        return thisVal;
      }
    };
  }

  require('modules')
  .get('kibana')
  .directive('inequality', function () {
    return {
      require: ['ngModel', '^form'],
      link: attachInequality()
    };
  });
});