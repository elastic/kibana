var _ = require('lodash');
var $ = require('jquery');
var grammar = require('raw!../chain.peg');
var PEG = require('pegjs');
var Parser = PEG.buildParser(grammar);

var app = require('ui/modules').get('apps/timelion', []);

app.directive('timelionExpression', function ($compile, $http) {
  return {
    restrict: 'A',
    link: function ($scope, $elem, $attrs) {


      var functionReference = {};
      $http.get('/timelion/functions').then(function (resp) {
        functionReference.byName = _.indexBy(resp.data, 'name');
        functionReference.List = resp.data;
      });

      $attrs.$observe('timelionExpression', function (val) {
        try {
          var possible = findFunction(getCaretPos(), Parser.parse(val).functions);
          if (functionReference.byName) {
            if (functionReference.byName[possible.function]) {
              $scope.suggestion = functionReference.byName[possible.function];
            } else {
              throw new Error('Unknown function: ' + possible.function);
            }
          }
        } catch (e) {
          $scope.suggestion = null
          console.log(e);
        }
      });

      function findFunction(position, functionList) {
        var currentFunction;

        _.each(functionList, function (func) {
          // max + 1 so we match to the right of the closing)
          if ((func.position.min) < position && position < (func.position.max + 1)) {
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

    }
  };
});