/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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
import grammar from 'raw-loader!../chain.peg';
import timelionExpressionInputTemplate from './timelion_expression_input.html';
import {
  SUGGESTION_TYPE,
  Suggestions,
  suggest,
  insertAtLocation,
} from './timelion_expression_input_helpers';
import { comboBoxKeyCodes } from '@elastic/eui';
import { getArgValueSuggestions } from '../services/arg_value_suggestions';

const Parser = PEG.generate(grammar);

export function TimelionExpInput($http, $timeout) {
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
    link: function(scope, elem) {
      const argValueSuggestions = getArgValueSuggestions();
      const expressionInput = elem.find('[data-expression-input]');
      const functionReference = {};
      let suggestibleFunctionLocation = {};

      scope.suggestions = new Suggestions();

      function init() {
        $http.get('../api/timelion/functions').then(function(resp) {
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
        if (scope.suggestions.isEmpty()) {
          return;
        }

        const { min, max } = suggestibleFunctionLocation;
        let insertedValue;
        let insertPositionMinOffset = 0;

        switch (scope.suggestions.type) {
          case SUGGESTION_TYPE.FUNCTIONS: {
            // Position the caret inside of the function parentheses.
            insertedValue = `${scope.suggestions.list[suggestionIndex].name}()`;

            // min advanced one to not replace function '.'
            insertPositionMinOffset = 1;
            break;
          }
          case SUGGESTION_TYPE.ARGUMENTS: {
            // Position the caret after the '='
            insertedValue = `${scope.suggestions.list[suggestionIndex].name}=`;
            break;
          }
          case SUGGESTION_TYPE.ARGUMENT_VALUE: {
            // Position the caret after the argument value
            insertedValue = `${scope.suggestions.list[suggestionIndex].name}`;
            break;
          }
        }

        const updatedExpression = insertAtLocation(
          insertedValue,
          scope.sheet,
          min + insertPositionMinOffset,
          max
        );
        scope.sheet = updatedExpression;

        const newCaretOffset = min + insertedValue.length;
        setCaretOffset(newCaretOffset);
      }

      function scrollToSuggestionAt(index) {
        // We don't cache these because the list changes based on user input.
        const suggestionsList = $('[data-suggestions-list]');
        const suggestionListItem = $('[data-suggestion-list-item]')[index];
        // Scroll to the position of the item relative to the list, not to the window.
        suggestionsList.scrollTop(suggestionListItem.offsetTop - suggestionsList[0].offsetTop);
      }

      function getCursorPosition() {
        if (expressionInput.length) {
          return expressionInput[0].selectionStart;
        }
        return null;
      }

      async function getSuggestions() {
        const suggestions = await suggest(
          scope.sheet,
          functionReference.list,
          Parser,
          getCursorPosition(),
          argValueSuggestions
        );

        // We're using ES6 Promises, not $q, so we have to wrap this in $apply.
        scope.$apply(() => {
          if (suggestions) {
            scope.suggestions.setList(suggestions.list, suggestions.type);
            scope.suggestions.show();
            suggestibleFunctionLocation = suggestions.location;
            $timeout(() => {
              const suggestionsList = $('[data-suggestions-list]');
              suggestionsList.scrollTop(0);
            }, 0);
            return;
          }

          suggestibleFunctionLocation = undefined;
          scope.suggestions.reset();
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
        scope.suggestions.hide();
      };

      scope.onKeyDownInput = e => {
        // If we've pressed any non-navigational keys, then the user has typed something and we
        // can exit early without doing any navigation. The keyup handler will pull up suggestions.
        if (!isNavigationalKey(e.keyCode)) {
          return;
        }

        switch (e.keyCode) {
          case comboBoxKeyCodes.UP:
            if (scope.suggestions.isVisible) {
              // Up and down keys navigate through suggestions.
              e.preventDefault();
              scope.suggestions.stepForward();
              scrollToSuggestionAt(scope.suggestions.index);
            }
            break;

          case comboBoxKeyCodes.DOWN:
            if (scope.suggestions.isVisible) {
              // Up and down keys navigate through suggestions.
              e.preventDefault();
              scope.suggestions.stepBackward();
              scrollToSuggestionAt(scope.suggestions.index);
            }
            break;

          case comboBoxKeyCodes.TAB:
            // If there are no suggestions or none is selected, the user tabs to the next input.
            if (scope.suggestions.isEmpty() || scope.suggestions.index < 0) {
              // Before letting the tab be handled to focus the next element
              // we need to hide the suggestions, otherwise it will focus these
              // instead of the time interval select.
              scope.suggestions.hide();
              return;
            }

            // If we have suggestions, complete the selected one.
            e.preventDefault();
            insertSuggestionIntoExpression(scope.suggestions.index);
            break;

          case comboBoxKeyCodes.ENTER:
            if (e.metaKey || e.ctrlKey) {
              // Re-render the chart when the user hits CMD+ENTER.
              e.preventDefault();
              scope.updateChart();
            } else if (!scope.suggestions.isEmpty()) {
              // If the suggestions are open, complete the expression with the suggestion.
              e.preventDefault();
              insertSuggestionIntoExpression(scope.suggestions.index);
            }
            break;

          case comboBoxKeyCodes.ESCAPE:
            e.preventDefault();
            scope.suggestions.hide();
            break;
        }
      };

      scope.onKeyUpInput = e => {
        // If the user isn't navigating, then we should update the suggestions based on their input.
        if (!isNavigationalKey(e.keyCode)) {
          getSuggestions();
        }
      };

      scope.onClickExpression = () => {
        getSuggestions();
      };

      scope.onClickSuggestion = index => {
        insertSuggestionIntoExpression(index);
      };

      scope.getActiveSuggestionId = () => {
        if (scope.suggestions.isVisible && scope.suggestions.index > -1) {
          return `timelionSuggestion${scope.suggestions.index}`;
        }
        return '';
      };

      init();
    },
  };
}
