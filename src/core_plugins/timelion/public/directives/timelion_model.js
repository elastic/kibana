/**
 * This directive provides the necessary $parsers for ensuring that multiline Timelion
 * expressions are formatted for human consumption and parsed for consumption by PEG.
 */

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/timelion');

export function addMarkupToMultilineExpression(expressionString) {
  // Convert newlines into line breaks.
  return expressionString.replace(/\n/g, '<br>');
}

export function removeMarkupFromMultilineExpression(expressionHtml) {
  // Allow whitespace to collapse.
  const encodedWhitespace = expressionHtml.replace(/&nbsp;/g, ' ');

  // Replace divs with linebreaks.
  const removedClosingDivs = encodedWhitespace.replace(/<\/div>/g, '');
  const brokenOnOpeningDivs = removedClosingDivs.replace(/<div>/g, '\n');

  // Preserve line-breaks.
  const splitOnBreaks = brokenOnOpeningDivs.split(/<br>/g);
  return splitOnBreaks.join('\n');
}

module.directive('timelionModel', () => {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function (scope, element, attrs, ngModelCtrl) {
      // Format expression for presentation to the user.
      ngModelCtrl.$formatters.push(addMarkupToMultilineExpression);

      // Parse user input for consumption by PEG (view to model).
      ngModelCtrl.$parsers.push(removeMarkupFromMultilineExpression);
    }
  };
});
