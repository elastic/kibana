import timelionExpressionSuggestionsTemplate from './suggestion.html';

const app = require('ui/modules').get('apps/timelion', []);

app.directive('timelionExpressionSuggestions', () => {
  return {
    restrict: 'E',
    scope: {
      suggestions: '=',
      selectedIndex: '=',
      onClickSuggestion: '&',
    },
    replace: true,
    template: timelionExpressionSuggestionsTemplate,
    link: function () {
    }
  };
});
