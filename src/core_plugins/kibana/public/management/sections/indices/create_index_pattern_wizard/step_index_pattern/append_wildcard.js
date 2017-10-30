import { uiModules } from 'ui/modules';

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
        // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode
        // is not recommended so we need to rely on `key` but browser support
        // is still spotty (https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key)
        // so just bail if it's not supported
        if (!e.key) {
          return;
        }

        if (!/[a-z0-9]/i.test(e.key)) {
          return;
        }

        // If the user is holdinng down ctrl/cmd, they are performing some shortcut
        // and do not interpret literally
        if (e.metaKey) {
          return;
        }

        let indexPatternName = $elem.val() + e.key;
        if (indexPatternName && indexPatternName.length === 1) {
          if (indexPatternName !== '*') {
            indexPatternName += '*';
            e.preventDefault();
            $elem.val(indexPatternName);
            $elem[0].setSelectionRange(1, 1);
          }
        }

        $ctrl.$setViewValue(indexPatternName);
      });
    }
  };
});
