define(function (require) {
  var _ = require('lodash');

  var INVALID = {}; // invalid flag
  var FLOATABLE = /^[\d\.e\-\+]+$/i;

  require('modules')
  .get('kibana')
  .directive('percentList', function () {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function ($scope, $el, attrs, ngModelCntr) {
        function parse(viewValue) {
          if (!_.isString(viewValue)) return INVALID;

          var nums = _(viewValue.split(','))
          .invoke('trim')
          .filter(Boolean)
          .map(function (num) {
            // prevent '100 boats' from passing
            return FLOATABLE.test(num) ? parseFloat(num) : NaN;
          });

          var ration = nums.none(_.isNaN);
          var ord = ration && nums.isOrdinal();
          var range = ord && nums.min() >= 0 && nums.max() <= 100;

          return range ? nums.value() : INVALID;
        }

        function makeString(list) {
          if (!_.isArray(list)) return INVALID;
          return list.join(', ');
        }

        function converter(/* fns... */) {
          var fns = _.toArray(arguments);
          return function (input) {
            var value = input;
            var valid = fns.every(function (fn) {
              return (value = fn(value)) !== INVALID;
            });

            ngModelCntr.$setValidity('listInput', valid);
            return valid ? value : void 0;
          };
        }

        ngModelCntr.$parsers.push(converter(parse));
        ngModelCntr.$formatters.push(converter(makeString));
      }
    };
  });

});