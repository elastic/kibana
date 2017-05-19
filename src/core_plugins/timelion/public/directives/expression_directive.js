/**
 * Timelion Expression Autocompleter
 *
 * This directive allows users to enter multiline timelion expressions. If the user has entered
 * a valid expression and then types a ".", this directive will display a list of suggestions.
 *
 * Users can navigate suggestions using the arrow keys. When a user selects a suggestion, it's
 * inserted into the expression and the caret position is updated to be inside of the newly-
 * added function's parentheses.
 *
 * Beneath the hood, we use a PEG grammar to validate the Timelion expression and detect if
 * the caret is in a position within the expression that allows functions to be suggested.
 *
 * NOTE: This directive doesn't work well with contenteditable divs. Challenges include:
 *   - You have to replace markup with newline characters and spaces when passing the expression
 *     to the grammar.
 *   - You have to do the opposite when loading a saved expression, so that it appears correctly
 *     within the contenteditable (i.e. replace newlines with <br> markup).
 *   - The Range and Selection APIs ignore newlines when providing caret position, so there is
 *     literally no way to insert suggestions into the correct place in a multiline expression
 *     that has more than a single consecutive newline.
 */

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

const Parser = PEG.buildParser(grammar);
const app = require('ui/modules').get('apps/timelion', []);

app.directive('timelionExpressionInput', function ($compile, $http, $timeout) {
  return {
    restrict: 'E',
    scope: {
      sheet: '=',
      getCaretOffset: '&',
      setCaretOffset: '&',
      updateChart: '&',
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
      transclude(scope.$parent, clone => {
        elem.prepend(clone);
      });

      const functionReference = {};
      let suggestibleFunctionLocation = {};

      scope.functionSuggestions = new FunctionSuggestions();

      function init() {
        $http.get('../api/timelion/functions').then(function (resp) {
          Object.assign(functionReference, {
            byName: _.indexBy(resp.data, 'name'),
            list: resp.data,
          });
        });
      }

      function insertSuggestionIntoExpression(suggestionIndex) {
        if (scope.functionSuggestions.isEmpty()) {
          return;
        }

        const functionName = `${scope.functionSuggestions.list[suggestionIndex].name}()`;
        const { min, max } = suggestibleFunctionLocation;

        // Update the expression with the function.
        const updatedExpression = insertAtLocation(functionName, scope.sheet, min, max);
        scope.sheet = updatedExpression;

        // Position the caret inside of the function parentheses.
        const newCaretOffset = min + functionName.length;
        scope.setCaretOffset({ caretOffset: newCaretOffset });

        // Hide suggestions.
        scope.functionSuggestions.reset();
      }

      function scrollToSuggestionAt(index) {
        const suggestionsList = $('[data-suggestions-list]');
        const suggestionListItem = $('[data-suggestion-list-item]')[index];
        // Scroll to the position of the item relative to the list, not to the window.
        suggestionsList.scrollTop(suggestionListItem.offsetTop - suggestionsList[0].offsetTop);
      }

      function getSuggestions() {
        const caretOffset = scope.getCaretOffset();

        suggest(
          scope.sheet,
          caretOffset,
          functionReference.list,
          Parser
        ).then(suggestions => {
          // We're using ES6 Promises, not $q, so we have to wrap this in $apply.
          scope.$apply(() => {
            scope.functionSuggestions.setList(suggestions.list);
            scope.functionSuggestions.show();
            suggestibleFunctionLocation = suggestions.functionLocation;
          });
        }, (noSuggestions = {}) => {
          scope.$apply(() => {
            suggestibleFunctionLocation = noSuggestions.functionLocation;
            scope.functionSuggestions.reset();
          });
        });
      }

      function isNavigationalKey(keyCode) {
        const keyCodes = _.values(navigationalKeys);
        return keyCodes.includes(keyCode);
      }

      function isUserInsertingNewLine(keyCode, isShiftPressed) {
        // SHIFT + ENTER will insert a new line.
        return keyCode === navigationalKeys.ENTER && isShiftPressed;
      }

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

        if (isUserInsertingNewLine(e.keyCode, e.shiftKey)) {
          return;
        }

        switch (e.keyCode) {
          case navigationalKeys.UP:
            if (scope.functionSuggestions.isVisible) {
              // Up and down keys navigate through suggestions.
              e.preventDefault();
              scope.functionSuggestions.stepForward();
              scrollToSuggestionAt(scope.functionSuggestions.index);
            }
            break;

          case navigationalKeys.DOWN:
            if (scope.functionSuggestions.isVisible) {
              // Up and down keys navigate through suggestions.
              e.preventDefault();
              scope.functionSuggestions.stepBackward();
              scrollToSuggestionAt(scope.functionSuggestions.index);
            }
            break;

          case navigationalKeys.TAB:
            // If there are no suggestions, the user tabs to the next input.
            if (scope.functionSuggestions.isEmpty()) {
              return;
            }

            // If we have suggestions, complete the selected one.
            e.preventDefault();
            insertSuggestionIntoExpression(scope.functionSuggestions.index);
            break;

          case navigationalKeys.ENTER:
            e.preventDefault();

            // If the suggestions are open, complete the expression with the suggestion.
            // Otherwise, the default action of submitting the input value will occur.
            if (!scope.functionSuggestions.isEmpty()) {
              insertSuggestionIntoExpression(scope.functionSuggestions.index);
            } else {
              // If the suggestions are closed, we should re-render the chart.
              scope.updateChart();
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

      scope.onClickSuggestion = insertSuggestionIntoExpression;

      init();
    }
  };
});
