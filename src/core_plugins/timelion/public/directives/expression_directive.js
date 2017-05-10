import _ from 'lodash';
import $ from 'jquery';
import grammar from 'raw!../chain.peg';
import PEG from 'pegjs';

import './partials/suggestion';
import timelionExpressionInputTemplate from './expression_directive.html';
import {
  FunctionSuggestions,
  suggest,
  insertAtLocation,
} from './expression_directive_helpers';

/*
Autocomplete proposal, this file doesn't actually work like this

function names
Do not auto complete .sometext(, rather insert a closing ) whenever a ( is typed.

.| (single dot)
.func|

argument names
We’ll need to sort out which function we’re inside, must be inside a function though

.function(|) // Suggest the first name aka most important arg, e.g. foo=
.function(fo|) // Suggest foo=
.function(foo=|) // Suggest [bar,baz]

.function(arg=bar, |) Suggest 2nd arg name, and so on

argument values
Only named arguments, necessarily provided optional by a plugin.
Must be inside a function, and start must be adjacent to the argument name

.function(arg=b|)
*/

const Parser = PEG.buildParser(grammar);

const app = require('ui/modules').get('apps/timelion', []);

app.directive('timelionExpressionInput', function ($compile, $http, $timeout) {
  return {
    restrict: 'E',
    scope: {
      sheet: '=',
    },
    replace: true,
    transclude: true,
    template: timelionExpressionInputTemplate,
    link: function (scope, elem, attrs, ctrl, transclude) {
      const navigationalKeys = {
        ESC: 27,
        UP: 38,
        DOWN: 40,
        TAB: 9,
        ENTER: 13
      };

      // Add the transcluded content. Assuming it's an input control of some sort, it will need
      // access to the parent scope so it can use ng-model correctly.
      let input;
      transclude(scope.$parent, clone => {
        elem.prepend(clone);
        input = elem.find('[data-timelion-expression-input]');
      });

      const functionReference = {};
      const caretLocation = {};

      scope.functionSuggestions = new FunctionSuggestions();

      function init() {
        $http.get('../api/timelion/functions').then(function (resp) {
          Object.assign(functionReference, {
            byName: _.indexBy(resp.data, 'name'),
            list: resp.data,
          });
        });
      }

      function setExpression(expression, caretPosition) {
        input.val(expression);
        input[0].selectionStart = input[0].selectionEnd = caretPosition;
      }

      function completeExpression(suggestionIndex) {
        if (scope.functionSuggestions.isEmpty()) {
          return;
        }

        const functionName = `${scope.functionSuggestions.list[suggestionIndex].name}()`;
        const expression = scope.sheet;
        const { min, max } = caretLocation;

        const newExpression = insertAtLocation(functionName, expression, min, max);
        const newCaretPosition = min + functionName.length - 1;
        setExpression(newExpression, newCaretPosition);

        scope.functionSuggestions.reset();
      }

      function scrollTo(selected) {
        const suggestionsListElem = $('[data-suggestions-list]');
        const suggestedElem = $($('[data-suggestion-list-item]')[selected]);

        if (!suggestedElem.position() || !suggestedElem.position().top) {
          return;
        }

        suggestionsListElem.scrollTop(suggestionsListElem.scrollTop() + suggestedElem.position().top);
      }

      function getSuggestions() {
        const caretPosition = input[0].selectionStart;

        suggest(
          scope.sheet,
          caretPosition,
          functionReference.list,
          Parser
        ).then(({ list, location }) => {
          // We're using ES6 Promises, not $q, so we have to wrap this in $apply.
          scope.$apply(() => {
            scope.functionSuggestions.setList(list);
            scope.functionSuggestions.show();
            Object.assign(caretLocation, location);
          });
        }, ({ location } = {}) => {
          scope.$apply(() => {
            Object.assign(caretLocation, location);
            scope.functionSuggestions.reset();
          });
        });
      }

      function isNavigationalKey(keyCode) {
        const keyCodes = _.values(navigationalKeys);
        return keyCodes.includes(keyCode);
      }

      scope.mouseUpHandler = () => {
        getSuggestions();
      };

      scope.blurHandler = () => {
        $timeout(() => {
          scope.functionSuggestions.hide();
        }, 100);
      };

      scope.keyDownHandler = e => {
        // If we've pressed any non-navigational keys, then the user has typed something and we
        // can exit early without doing any navigation.
        if (!isNavigationalKey(e.keyCode)) {
          return;
        }

        switch (e.keyCode) {
          case navigationalKeys.UP:
            // Up and down keys navigate through suggestions.
            e.preventDefault();
            scope.functionSuggestions.stepForward();
            scrollTo(scope.functionSuggestions.index);
            break;

          case navigationalKeys.DOWN:
            // Up and down keys navigate through suggestions.
            e.preventDefault();
            scope.functionSuggestions.stepBackward();
            scrollTo(scope.functionSuggestions.index);
            break;

          case navigationalKeys.TAB:
            // If there are no suggestions, the user tabs to the next input.
            if (scope.functionSuggestions.isEmpty()) {
              return;
            }

            // If we have suggestions, complete the selected one.
            e.preventDefault();
            completeExpression(scope.functionSuggestions.index);
            break;

          case navigationalKeys.ENTER:
            // If the suggestions are open, complete the expression with the suggestion.
            // Otherwise, the default action of submitting the input value will occur.
            if (!scope.functionSuggestions.isEmpty()) {
              e.preventDefault();
              completeExpression(scope.functionSuggestions.index);
            }
            break;

          case navigationalKeys.ESC:
            e.preventDefault();
            scope.functionSuggestions.hide();
            break;
        }
      };

      scope.keyUpHandler = e => {
        // If the user isn't navigating, then we should update the suggestions based on their input.
        if (!isNavigationalKey(e.keyCode)) {
          getSuggestions();
        }
      };

      scope.onClickSuggestion = completeExpression;

      init();
    }
  };
});
