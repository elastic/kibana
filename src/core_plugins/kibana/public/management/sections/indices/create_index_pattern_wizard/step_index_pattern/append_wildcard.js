import { uiModules } from 'ui/modules';
import { appendWildcard } from './lib/append_wildcard';

const module = uiModules.get('apps/management');

/**
 * This directive automatically appends a wildcard to the input field
 * after the user starts typing. It lets the user delete the wildcard
 * if necessary. If the value of the input field is set back to an empty
 * string, the wildcard is immediately re-appended after the user starts
 * typing. This is intended to be a UX improvement for the index pattern
 * creation page. See https://github.com/elastic/kibana/pull/13454
 */
module.directive('appendWildcard', function () {
  return {
    require: 'ngModel',
    link: function ($scope, $elem, $attrs, $ctrl) {
      $elem.on('keydown', (e) => {
        const newIndexPattern = appendWildcard(e, $elem.val());
        if (newIndexPattern) {
          e.preventDefault();
          $elem.val(newIndexPattern);
          $elem[0].setSelectionRange(1, 1);
          $ctrl.$setViewValue(newIndexPattern);
        }
      });
    }
  };
});
