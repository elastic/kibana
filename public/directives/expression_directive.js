var _ = require('lodash');
var $ = require('jquery');
var grammar = require('raw!../chain.peg');
var PEG = require('pegjs');
var Parser = PEG.buildParser(grammar);
var template =  require('./partials/suggestion.html');

var app = require('ui/modules').get('apps/timelion', []);

/*
Two kinds of suggestors

Completion suggestor
- When expression fails to parse
- Hitting tab will replace failing postion with suggestion

Reference suggestor
- When inside a:
 - function
  - suggest named argument in order of position
 - named argument
  - suggest argument value

*/

app.directive('timelionExpression', function ($compile, $http, $timeout) {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function ($scope, $elem, $attrs, ngModelCtrl) {

      var keys = {
        ESC: 27,
        UP: 38,
        DOWN: 40,
        TAB: 9,
        ENTER: 13
      };

      var functionReference = {};

      function init() {
        resetSuggestions();
        $elem.on('mouseup', function () {
          doSuggest();
          $scope.$apply();
        });
        $elem.on('keydown',  keyDownHandler);
        $elem.on('keyup',  keyUpHandler);

        $elem.after($compile(template)($scope));
        $http.get('/timelion/functions').then(function (resp) {
          functionReference.byName = _.indexBy(resp.data, 'name');
          functionReference.list = resp.data;
        });

        /*
        $scope.$watchCollection('suggestions', function (val) {
          if (val.position.min == null) return;
        });
        */
      }

      function suggest(val) {
        try {
          // Inside an existing function providing suggestion only as a reference. Maybe suggest an argument?
          var possible = findFunction(getCaretPos(), Parser.parse(val).functions);

          // TODO: Reference suggestors. Only supporting completion right now;
          resetSuggestions();
          return;


          if (functionReference.byName) {
            if (functionReference.byName[possible.function]) {
              $scope.suggestions.list = [functionReference.byName[possible.function]];
            } else {
              throw new Error('Unknown function: ' + possible.function);
            }
          }
        } catch (e) {
          try { // Is this a structured exception?
            e = JSON.parse(e.message);
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
            }
            $scope.suggestions.position = e.position;
          } catch (e) {
            resetSuggestions();
          }
        }
        $scope.$apply();
      }

      function doSuggest() {
        suggest($attrs.timelionExpression);
      }

      function validateSelection() {
        var maxSelection = $scope.suggestions.list.length - 1;
        if ($scope.suggestions.selected > maxSelection) $scope.suggestions.selected = maxSelection;
        else if ($scope.suggestions.selected < 0) $scope.suggestions.selected = 0;
      }

      function keyDownHandler(e) {
        doSuggest();

        switch (e.keyCode) {
          case keys.UP:
            if ($scope.suggestions.selected > 0) $scope.suggestions.selected--;
            e.preventDefault();
            break;
          case keys.DOWN:
            $scope.suggestions.selected++;
            e.preventDefault();
            break;
          case keys.ESC:
            resetSuggestions();
            e.preventDefault();
            $scope.$apply();
            break;
          case keys.TAB:
            if (!$scope.suggestions.list.length) break;
            var expression = $elem.val();
            var startOf = expression.slice(0, $scope.suggestions.position.min + 1);
            var endOf =  expression.slice($scope.suggestions.position.max, expression.length);
            var newVal = startOf + $scope.suggestions.list[$scope.suggestions.selected].name + '()' + endOf;

            $elem.val(newVal);
            $elem[0].selectionStart = $elem[0].selectionEnd =
              (startOf + $scope.suggestions.list[$scope.suggestions.selected].name + '()').length - 1;
            ngModelCtrl.$setViewValue(newVal);

            resetSuggestions();
            e.preventDefault();
            break;
        }
        validateSelection();
        scrollTo($scope.suggestions);
        $scope.$apply();
      }


      function resetSuggestions() {
        $scope.suggestions = {
          selected: 0,
          list: [],
          position: {}
        };
        return $scope.suggestions;
      }

      function keyUpHandler(e) {
        switch (e.keyCode) {
          case keys.UP:
          case keys.DOWN:
          case keys.ESC:
          case keys.TAB:
            return;
        }

        doSuggest();
        validateSelection();
        $scope.$apply();
      }


      function scrollTo(suggestions) {
        var suggestionsListElem = $('.suggestions');
        var suggestionElems = $('.suggestion');
        var suggestedElem = $(suggestionElems[suggestions.selected]);

        if (suggestions.selected < 0
          || suggestions.list.length - 1 < suggestions.selected
          || !suggestedElem.position().top) return;

        $timeout(function () {
          suggestionsListElem.scrollTop(suggestionsListElem.scrollTop() + suggestedElem.position().top);
        }, 0);
      }

      function findFunction(position, functionList) {
        var currentFunction;

        _.each(functionList, function (func) {
          if ((func.position.min) < position && position < (func.position.max)) {
            if (!currentFunction || func.position.text.length < currentFunction.position.text.length) {
              currentFunction = func;
            }
          }
        });

        return currentFunction;
      };

      function getCaretPos() {
        return $elem[0].selectionStart;
      };

      function setSelection(start, end) {
        $elem[0].selectionStart = start;
        $elem[0].selectionEnd = end;
      }

      init();

    }
  };
});