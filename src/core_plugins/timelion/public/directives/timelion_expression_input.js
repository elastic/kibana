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
import PEG from 'pegjs';

import grammar from 'raw!../chain.peg';
import './timelion_expression_suggestions/timelion_expression_suggestions';
import timelionExpressionInputTemplate from './timelion_expression_input.html';
import {
  FunctionSuggestions,
  suggest,
  insertAtLocation,
} from './timelion_expression_input_helpers';
import { comboBoxKeyCodes } from 'ui_framework/services';

const Parser = PEG.buildParser(grammar);
const app = require('ui/modules').get('apps/timelion', []);

app.directive('timelionExpressionInput', function ($document, $http, $interval, $timeout) {
  return {
    restrict: 'E',
    scope: {
      rows: '=',
      sheet: '=',
      updateChart: '&',
      shouldPopoverSuggestions: '@',
    },
    replace: true,
    template: timelionExpressionInputTemplate,
    link: function (scope, elem) {
      const expressionInput = elem.find('[data-expression-input]');
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

      function setCaretOffset(caretOffset) {
        // Wait for Angular to update the input with the new expression and *then* we can set
        // the caret position.
        $timeout(() => {
          expressionInput.focus();
          expressionInput[0].selectionStart = expressionInput[0].selectionEnd = caretOffset;
          scope.$apply();
        }, 0);
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
        setCaretOffset(newCaretOffset);
      }

      function scrollToSuggestionAt(index) {
        // We don't cache these because the list changes based on user input.
        const suggestionsList = $('[data-suggestions-list]');
        const suggestionListItem = $('[data-suggestion-list-item]')[index];
        // Scroll to the position of the item relative to the list, not to the window.
        suggestionsList.scrollTop(suggestionListItem.offsetTop - suggestionsList[0].offsetTop);
      }

      function getSuggestions() {
        suggest(
          scope.sheet,
          functionReference.list,
          Parser
        ).then(suggestions => {
          // We're using ES6 Promises, not $q, so we have to wrap this in $apply.
          scope.$apply(() => {
            scope.functionSuggestions.setList(suggestions.list);
            scope.functionSuggestions.show();
            suggestibleFunctionLocation = suggestions.functionLocation;
            $timeout(() => {
              const suggestionsList = $('[data-suggestions-list]');
              suggestionsList.scrollTop(0);
            }, 0);
          });
        }, (noSuggestions = {}) => {
          scope.$apply(() => {
            suggestibleFunctionLocation = noSuggestions.functionLocation;
            scope.functionSuggestions.reset();
          });
        });
      }

      function isNavigationalKey(keyCode) {
        const keyCodes = _.values(comboBoxKeyCodes);
        return keyCodes.includes(keyCode);
      }

      scope.onFocusInput = () => {
        // Wait for the caret position of the input to update and then we can get suggestions
        // (which depends on the caret position).
        $timeout(getSuggestions, 0);
      };

      scope.onBlurInput = () => {
        scope.functionSuggestions.hide();
      };

      scope.onKeyDownInput = e => {
        // If we've pressed any non-navigational keys, then the user has typed something and we
        // can exit early without doing any navigation. The keyup handler will pull up suggestions.
        if (!isNavigationalKey(e.keyCode)) {
          return;
        }

        switch (e.keyCode) {
          case comboBoxKeyCodes.UP:
            if (scope.functionSuggestions.isVisible) {
              // Up and down keys navigate through suggestions.
              e.preventDefault();
              scope.functionSuggestions.stepForward();
              scrollToSuggestionAt(scope.functionSuggestions.index);
            }
            break;

          case comboBoxKeyCodes.DOWN:
            if (scope.functionSuggestions.isVisible) {
              // Up and down keys navigate through suggestions.
              e.preventDefault();
              scope.functionSuggestions.stepBackward();
              scrollToSuggestionAt(scope.functionSuggestions.index);
            }
            break;

          case comboBoxKeyCodes.TAB:
            // If there are no suggestions or none is selected, the user tabs to the next input.
            if (scope.functionSuggestions.isEmpty() || scope.functionSuggestions.index < 0) {
              // Before letting the tab be handled to focus the next element
              // we need to hide the suggestions, otherwise it will focus these
              // instead of the time interval select.
              scope.functionSuggestions.hide();
              return;
            }

            // If we have suggestions, complete the selected one.
            e.preventDefault();
            insertSuggestionIntoExpression(scope.functionSuggestions.index);
            break;

          case comboBoxKeyCodes.ENTER:
            if (e.metaKey || e.ctrlKey) {
              // Re-render the chart when the user hits CMD+ENTER.
              e.preventDefault();
              scope.updateChart();
            } else if (!scope.functionSuggestions.isEmpty()) {
              // If the suggestions are open, complete the expression with the suggestion.
              e.preventDefault();
              insertSuggestionIntoExpression(scope.functionSuggestions.index);
            }
            break;

          case comboBoxKeyCodes.ESCAPE:
            e.preventDefault();
            scope.functionSuggestions.hide();
            break;
        }
      };

      scope.onKeyUpInput = e => {
        // If the user isn't navigating, then we should update the suggestions based on their input.
        if (!isNavigationalKey(e.keyCode)) {
          getSuggestions();
        }
      };

      scope.onClickSuggestion = index => {
        insertSuggestionIntoExpression(index);
      };

      scope.getActiveSuggestionId = () => {
        if(scope.functionSuggestions.isVisible && scope.functionSuggestions.index > -1) {
          return `timelionSuggestion${scope.functionSuggestions.index}`;
        }
        return '';
      };

      init();
    }
  };
});
