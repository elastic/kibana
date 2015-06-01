define(function (require) {
  var $ = require('jquery');

  require('modules')
    .get('kibana')
    .directive('optionsDisabled', function ($parse) {

      function disableOptions(scope, attr, element, data, fnDisableIfTrue) {
        // refresh the disabled options in the select element.
        $('option[value!="?"]', element).each(function (i) {
          var locals = {};
          locals[attr] = data[i];
          $(this).attr('disabled', fnDisableIfTrue(scope, locals));
        });
      }

      return {
        priority: 0,
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, element, attrs) {
          // parse expression and build array of disabled options
          var expElements = attrs.optionsDisabled.match(/^\s*(.+)\s+for\s+(.+)\s+in\s+(.+)?\s*/);
          var attrToWatch = expElements[3];
          var fnDisableIfTrue = $parse(expElements[1]);

          scope.$watch(attrToWatch, function (newValue, oldValue) {
            if (newValue) {
              disableOptions(scope, expElements[2], element, newValue, fnDisableIfTrue);
            }
          }, true);

          // handle model updates properly
          scope.$watch(attrs.ngModel, function (newValue, oldValue) {
            var disOptions = $parse(attrToWatch)(scope);
            if (newValue) {
              disableOptions(scope, expElements[2], element, disOptions, fnDisableIfTrue);
            }
          });
        }
      };
    });
});
