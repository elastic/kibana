define(function (require) {
  var _ = require('lodash');

  require('modules')
    .get('kibana')
    .directive('validateIp', function () {
      return {
        restrict: 'A',
        require: 'ngModel',
        scope: {
          'ngModel': '=',
        },
        link: function ($scope, elem, attr, ngModel) {

          var isIP = function (value) {
            if (!value) return false;
            var parts = value.match(/([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)/);

            var valid = true;
            if (parts) {
              _.each(parts.slice(1, 5), function (octet) {
                if (octet > 255 || octet < 0) valid = false;
              });
            } else {
              valid = false;
            }
            return valid;
          };

          // From User
          ngModel.$parsers.unshift(function (value) {
            var valid = isIP(value);
            ngModel.$setValidity('ipInput', valid);
            return valid ? value : undefined;
          });

          // To user
          ngModel.$formatters.unshift(function (value) {
            ngModel.$setValidity('ipInput', isIP(value));
            return value;
          });

        }
      };
    });
});