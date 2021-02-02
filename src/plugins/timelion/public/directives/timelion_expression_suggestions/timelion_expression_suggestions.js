/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import template from './timelion_expression_suggestions.html';

export function TimelionExpressionSuggestions() {
  return {
    restrict: 'E',
    scope: {
      suggestions: '=',
      suggestionsType: '=',
      selectedIndex: '=',
      onClickSuggestion: '&',
      shouldPopover: '=',
    },
    replace: true,
    template,
    link: function (scope) {
      // This will prevent the expression input from losing focus.
      scope.onMouseDown = (e) => e.preventDefault();
    },
  };
}
