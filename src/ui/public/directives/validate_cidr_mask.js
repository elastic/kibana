import { CidrMask } from 'ui/utils/cidr_mask';
import { uiModules } from 'ui/modules';

uiModules.get('kibana').directive('validateCidrMask', function () {
  return {
    restrict: 'A',
    require: 'ngModel',
    scope: {
      'ngModel': '='
    },
    link: function ($scope, elem, attr, ngModel) {
      ngModel.$parsers.unshift(validateCidrMask);
      ngModel.$formatters.unshift(validateCidrMask);

      function validateCidrMask(mask) {
        if (mask == null || mask === '') {
          ngModel.$setValidity('cidrMaskInput', true);
          return null;
        }

        try {
          mask = new CidrMask(mask);
          ngModel.$setValidity('cidrMaskInput', true);
          return mask.toString();
        } catch (e) {
          ngModel.$setValidity('cidrMaskInput', false);
        }
      }
    }
  };
});
