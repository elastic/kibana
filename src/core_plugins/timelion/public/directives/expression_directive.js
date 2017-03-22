import _ from 'lodash';
import $ from 'jquery';
import grammar from 'raw!../chain.peg';
import PEG from 'pegjs';
const Parser = PEG.buildParser(grammar);
import template from './partials/suggestion.html';

const app = require('ui/modules').get('apps/timelion', []);

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

app.directive('timelionExpression', function ($compile, $http, $timeout, $rootScope) {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function ($scope, $elem, $attrs, ngModelCtrl) {

      const keys = {
        ESC: 27,
        UP: 38,
        DOWN: 40,
        TAB: 9,
        ENTER: 13
      };

      const functionReference = {};

      function init() {
        resetSuggestions();
        $elem.on('mouseup', function () {
          suggest($attrs.timelionExpression);
          digest();
        });
        $elem.on('keydown',  keyDownHandler);
        $elem.on('keyup',  keyUpHandler);
        $elem.on('blur', function () {
          $timeout(function () {
            $scope.suggestions.show = false;
          }, 100);
        });

        $elem.after($compile(template)($scope));
        $http.get('../api/timelion/functions').then(function (resp) {
          functionReference.byName = _.indexBy(resp.data, 'name');
          functionReference.list = resp.data;
        });
      }

      $scope.$on('$destroy', function () {
        $elem.off('mouseup');
        $elem.off('keydown');
        $elem.off('keyup');
        $elem.off('blur');
      });

      function suggest(val) {
        try {
          // Inside an existing function providing suggestion only as a reference. Maybe suggest an argument?
          const possible = findFunction(getCaretPos(), Parser.parse(val).functions);
          // TODO: Reference suggestors. Only supporting completion right now;
          resetSuggestions();
          return;


          if (functionReference.byName) {
            if (functionReference.byName[possible.function]) {
              $scope.suggestions.list = [functionReference.byName[possible.function]];
              $scope.suggestions.show = true;
            } else {
              resetSuggestions();
            }
          }
        } catch (e) {
          try { // Is this a structured exception?
            e = JSON.parse(e.message);
            if (e.location.min > getCaretPos() || e.location.max <= getCaretPos()) {
              resetSuggestions();
              return;
            }
            // TODO: Abstract structured exception handling;
            if (e.type === 'incompleteFunction') {
              if (e.function == null) {
                $scope.suggestions.list = functionReference.list;
              } else {
                $scope.suggestions.list = _.compact(_.map(functionReference.list, function (func) {
                  if (_.startsWith(func.name, e.function)) {
                    return func;
                  }
                }));
              }
              $scope.suggestions.show = true;
            }
            $scope.suggestions.location = e.location;
          } catch (e) {
            resetSuggestions();
          }
        }
        digest();
      }

      function validateSelection() {
        const maxSelection = $scope.suggestions.list.length - 1;
        if ($scope.suggestions.selected > maxSelection) $scope.suggestions.selected = maxSelection;
        else if ($scope.suggestions.selected < 0) $scope.suggestions.selected = 0;
      }

      $scope.completeExpression = function (selected) {
        if (!$scope.suggestions.list.length) return;
        const expression = $attrs.timelionExpression;
        const startOf = expression.slice(0, $scope.suggestions.location.min);
        const endOf =  expression.slice($scope.suggestions.location.max, expression.length);

        const completeFunction = $scope.suggestions.list[selected].name + '()';

        const newVal = startOf + completeFunction + endOf;

        $elem.val(newVal);
        $elem[0].selectionStart = $elem[0].selectionEnd =
          (startOf + completeFunction).length - 1;
        ngModelCtrl.$setViewValue(newVal);

        resetSuggestions();
      };


      function keyDownHandler(e) {
        if (_.contains(_.values(keys), e.keyCode)) e.preventDefault();
        switch (e.keyCode) {
          case keys.UP:
            if ($scope.suggestions.selected > 0) $scope.suggestions.selected--;
            break;
          case keys.DOWN:
            $scope.suggestions.selected++;
            break;
          case keys.TAB:
            $scope.completeExpression($scope.suggestions.selected);
            break;
          case keys.ENTER:
            if ($scope.suggestions.list.length) {
              $scope.completeExpression($scope.suggestions.selected);
            } else {
              $elem.submit();
            }
            break;
          case keys.ESC:
            $scope.suggestions.show = false;
            break;
        }
        scrollTo($scope.suggestions);
        digest();
      }

      function keyUpHandler(e) {
        if (_.contains(_.values(keys), e.keyCode)) return;

        suggest($attrs.timelionExpression);
        validateSelection();
        digest();
      }

      function resetSuggestions() {
        $scope.suggestions = {
          selected: 0,
          list: [],
          position: {},
          show: false
        };
        return $scope.suggestions;
      }

      function scrollTo(suggestions) {
        validateSelection();
        const suggestionsListElem = $('.suggestions');
        const suggestedElem = $($('.suggestion')[suggestions.selected]);

        if (!suggestedElem.position() || !suggestedElem.position().top) return;

        suggestionsListElem.scrollTop(suggestionsListElem.scrollTop() + suggestedElem.position().top);
      }

      function findFunction(position, functionList) {
        let bestFunction;

        _.each(functionList, function (func) {
          if ((func.location.min) < position && position < (func.location.max)) {
            if (!bestFunction || func.text.length < bestFunction.text.length) {
              bestFunction = func;
            }
          }
        });

        return bestFunction;
      }

      function getCaretPos() {
        return $elem[0].selectionStart;
      }

      function digest() {
        $rootScope.$$phase || $scope.$digest();
      }

      init();

    }
  };
});
