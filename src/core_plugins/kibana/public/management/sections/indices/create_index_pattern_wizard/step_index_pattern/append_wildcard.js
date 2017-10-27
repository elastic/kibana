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
      $scope.appendedWildcard = false;

      function setElementValue(val, event, setCursorBackOneCharacter = false) {
        event.preventDefault();
        $elem.val(val);
        if (setCursorBackOneCharacter) {
          $elem[0].setSelectionRange(1, 1);
        }
      }

      $elem.on('keydown', (e) => {
        const charStr = String.fromCharCode(e.keyCode);
        if (!/[a-z0-9]/i.test(charStr)) {
          return;
        }

        let indexPatternName = $elem.val() + e.key;

        if (indexPatternName && indexPatternName.length === 1) {
          if (indexPatternName === '*') {
            if ($scope.appendedWildcard) {
              indexPatternName = '';
              setElementValue(indexPatternName, e);
              $scope.appendedWildcard = false;
            }
          } else {
            indexPatternName += '*';
            $scope.appendedWildcard = true;
            setElementValue(indexPatternName, e, true);
          }
        }

        $ctrl.$setViewValue(indexPatternName);
      });
    }
  };
});
